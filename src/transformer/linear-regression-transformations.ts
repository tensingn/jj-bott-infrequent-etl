import { PlayerGameModel, PlayerModel, PositionNames } from "@tensingn/jj-bott-models";

export const playerModelsAndPlayerGameModelsToLinRegData = (
	playerModels: Array<PlayerModel>,
	playerGameModels: Array<PlayerGameModel>
): Array<Array<string>> => {
	const playerModelAndPlayerGamesMap = new Map<PlayerModel, Array<PlayerGameModel>>();
	playerGameModels.forEach((playerGameModel) => {
		const player = playerModels.find((p) => p.id === playerGameModel.playerID);
		if (!player) {
			return;
		}

		if (playerModelAndPlayerGamesMap.has(player)) {
			playerModelAndPlayerGamesMap.get(player)?.push(playerGameModel);
		} else {
			playerModelAndPlayerGamesMap.set(player, [playerGameModel]);
		}
	});

	// each player's games must be sorted before further processing
	playerModelAndPlayerGamesMap.forEach(
		(
			playerPlayerGameModels: Array<PlayerGameModel>,
			key: PlayerModel,
			map: Map<PlayerModel, Array<PlayerGameModel>>
		) => {
			playerPlayerGameModels.sort((game1, game2) => {
				return parseInt(game1.season) - parseInt(game2.season) || parseInt(game1.week) - parseInt(game2.week);
			});
			map.set(key, playerPlayerGameModels);
		}
	);

	const linRegData = new Array<Array<string>>();
	playerModelAndPlayerGamesMap.forEach((playerPlayerGameModels: Array<PlayerGameModel>, playerModel: PlayerModel) => {
		playerPlayerGameModels.forEach((game) => {
			// pos, avg ppg this season, avg ppg last season, opp avg ppg this season, actual pts
			const values = new Array<string>(5);

			// pos
			values[0] = determinePrimaryPositionInGame(playerModel, game);

			// avg ppg this season
			values[1] = calculateAveragePointsPerGameThisSeason(game, playerPlayerGameModels);

			// avg ppg last season
			values[2] = calculateAveragePointsPerGameLastSeason(game, playerPlayerGameModels);

			// avg stat rank for position
			values[3] = calculateAverageStatRankForPosition(game, values[0] as PositionNames);

			// opp avg ppg this season
			const opponentID = game.opponent;
			const opponent = playerModels.find((p) => p.id === opponentID);
			if (!opponent) {
				console.log("no opponent for " + game.id);
			} else {
				const opponentGames = playerModelAndPlayerGamesMap.get(opponent) ?? [];
				values[4] = calculateAveragePointsPerGameThisSeason(game, opponentGames);
			}

			// actual score
			values[5] = game.points;

			linRegData.push(values);
		});
	});

	return linRegData;
};

const determinePrimaryPositionInGame = (
	playerModel: PlayerModel,
	playerGameModel: PlayerGameModel
): PositionNames | "NotSet" => {
	if (playerModel.positions.length === 1) return playerModel.positions[0];

	// if multiple positions, use the position that generated the most yards.
	// i.e. if player is rb/wr and player had 100 rec yds and 50 rush yds, return wr
	let position: PositionNames | "NotSet" = playerModel.positions[0];
	const passYds = playerGameModel.stats.Passing?.passYds ?? 0;
	const rushYds = playerGameModel.stats.Rushing?.rushYds ?? 0;
	const recYds = playerGameModel.stats.Receiving?.recYds ?? 0;

	if (passYds >= rushYds && passYds >= recYds && playerModel.positions.includes("QB")) {
		position = "QB";
	}

	if (rushYds >= passYds && rushYds >= recYds && playerModel.positions.includes("RB")) {
		position = "RB";
	}

	if (recYds >= rushYds && recYds >= passYds) {
		if (playerModel.positions.includes("WR")) {
			position = "WR";
		} else if (playerModel.positions.includes("TE")) {
			position = "TE";
		}
	}

	return position;
};

const calculateAveragePointsPerGameThisSeason = (
	currentGame: PlayerGameModel,
	playerGames: Array<PlayerGameModel>
): string => {
	let totalPointsThisSeason = 0;
	let gamesBeforeCurrentGame = 0;

	for (const playerGame of playerGames) {
		if (playerGame.gameID === currentGame.gameID) {
			break;
		}

		if (currentGame.season === playerGame.season) {
			totalPointsThisSeason += parseFloat(playerGame.points);
			gamesBeforeCurrentGame++;
		}
	}

	return (totalPointsThisSeason / (gamesBeforeCurrentGame || 1)).toString();
};

const calculateAveragePointsPerGameLastSeason = (
	currentGame: PlayerGameModel,
	playerGames: Array<PlayerGameModel>
): string => {
	if (currentGame.season === playerGames[0].season) return "0";

	let totalPointsLastSeason = 0;
	let totalGamesPlayerLastSeason = 0;
	for (const playerGame of playerGames) {
		if (parseInt(currentGame.season) - parseInt(playerGame.season) === 1) {
			totalGamesPlayerLastSeason++;
			totalPointsLastSeason += parseFloat(playerGame.points);
		} else if (parseInt(currentGame.season) - parseInt(playerGame.season) < 1) {
			break;
		}
	}

	return (totalPointsLastSeason / totalGamesPlayerLastSeason).toString();
};

const calculateAverageStatRankForPosition = (game: PlayerGameModel, position: PositionNames): string => {
	let sum = 0;
	let count = 0;

	try {
		switch (position) {
			case "QB":
				if (game.statRankings.Passing) {
					sum +=
						game.statRankings.Passing.int +
						game.statRankings.Passing.passAttempts +
						game.statRankings.Passing.passTD +
						game.statRankings.Passing.passYds;
					count += 4;
				}
				if (game.statRankings.Rushing) {
					sum +=
						game.statRankings.Rushing.carries + game.statRankings.Rushing.rushTD + game.statRankings.Rushing.rushYds;
					count += 3;
				}
				break;
			case "RB":
			case "FB":
				if (game.statRankings.Rushing) {
					sum +=
						game.statRankings.Rushing.carries + game.statRankings.Rushing.rushTD + game.statRankings.Rushing.rushYds;
					count += 3;
				}
				if (game.statRankings.Receiving) {
					sum +=
						game.statRankings.Receiving.recTD +
						game.statRankings.Receiving.recYds +
						game.statRankings.Receiving.receptions +
						game.statRankings.Receiving.targets;
					count += 4;
				}
				break;
			case "WR":
			case "TE":
				if (game.statRankings.Receiving) {
					sum +=
						game.statRankings.Receiving.recTD +
						game.statRankings.Receiving.recYds +
						game.statRankings.Receiving.receptions +
						game.statRankings.Receiving.targets;
					count += 4;
				}
				break;
			case "K":
				if (game.statRankings.Kicking) {
					sum += game.statRankings.Kicking.fgMade + game.statRankings.Kicking.xpMade;
					count += 2;
				}
				break;
			case "DEF":
				if (game.statRankings.Defense) {
					sum +=
						game.statRankings.Defense.ptsAllowed +
						game.statRankings.Defense.takeaways +
						game.statRankings.Defense.ydsAllowed;
					count += 3;
				}
				break;
			default:
				throw new Error("invalid position");
		}
	} catch (e) {
		console.log(game.id);
	}

	return (sum / count).toString();
};
