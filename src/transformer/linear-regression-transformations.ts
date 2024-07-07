import { PlayerGameModel, PlayerModel, PositionNames, PositionNamesArray } from "@tensingn/jj-bott-models";

export const playerModelsAndPlayerGameModelsToLinRegData = (
	playerModels: Array<PlayerModel>,
	playerGameModels: Array<PlayerGameModel>,
	defensePlayerGameModels: Array<PlayerGameModel>
): Array<LinRegModel> => {
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

	const linRegData = new Array<LinRegModel>();
	playerModelAndPlayerGamesMap.forEach((playerPlayerGameModels: Array<PlayerGameModel>, playerModel: PlayerModel) => {
		playerPlayerGameModels.forEach((game) => {
			const values = new LinRegModel();
			values.pgID = game.id;
			values.pID = game.playerID;
			values.seasonWeek = game.season + (parseInt(game.week) < 10 ? "0" + game.week : game.week);

			// pos
			values.pos = PositionNamesArray.indexOf(determinePrimaryPositionInGame(playerModel, game));

			// is home
			values.isHome = +game.isHome;

			// avg ppg this season
			values.avgPPG = calculateAveragePointsPerGameThisSeason(game, playerPlayerGameModels);

			// avg ppg last season
			// values[2] = determineAveragePointsPerGameLastSeason(
			// 	game,
			// 	playerPlayerGameModels
			// );

			// avg of last 5 games
			values.avgPPGL5 = calculateAveragePointsOfLast5Games(game, playerPlayerGameModels);

			values.avgPosRank = calculateAverageStatRankForPosition(game, PositionNamesArray[values.pos]);

			// opp avg ppg this season
			const opponentID = game.opponent;
			const opponent = playerModels.find((p) => p.id === opponentID);
			if (!opponent) {
				console.log("no opponent for " + game.id);
			} else {
				const opponentGames = defensePlayerGameModels.filter((dpg) => dpg.playerID === opponent.id) ?? [];
				values.oppAvgPPG = calculateAveragePointsPerGameThisSeason(game, opponentGames);

				const opponentGame = opponentGames.find((g) => g.gameID === game.gameID);
				if (!opponentGame) throw new Error("could not find corresponding opponent game");
				values.oppAvgRankAgainstPos = calculateOppAverageStatRankAgainstPosition(
					opponentGame,
					PositionNamesArray[values.pos]
				);
			}

			// actual score
			values.actual = parseFloat(game.points);

			if (values.avgPosRank !== -1) {
				linRegData.push(values);
			}
		});
	});

	return linRegData;
};

const determinePrimaryPositionInGame = (playerModel: PlayerModel, playerGameModel: PlayerGameModel): PositionNames => {
	if (playerModel.positions[0] === "NotSet") throw new Error("invalid position");

	if (playerModel.positions.length === 1) return playerModel.positions[0];

	// if multiple positions, use the position that generated the most yards.
	// i.e. if player is rb/wr and player had 100 rec yds and 50 rush yds, return wr
	let position: PositionNames = playerModel.positions[0];
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
): number => {
	let totalPointsThisSeason = 0;
	let gamesBeforeCurrentGame = 0;

	for (const playerGame of playerGames) {
		if (playerGame.gameID === currentGame.gameID) {
			break;
		}

		if (currentGame.season === playerGame.season) {
			totalPointsThisSeason += parseInt(playerGame.points);
			gamesBeforeCurrentGame++;
		}
	}

	return totalPointsThisSeason / (gamesBeforeCurrentGame || 1);
};

const calculateAveragePointsPerGameLastSeason = (
	currentGame: PlayerGameModel,
	playerGames: Array<PlayerGameModel>
): string => {
	if (currentGame.season === playerGames[0].season) return "0";

	let totalPointsLastSeason = 0;
	let totalGamesPlayerLastSeason = 0;
	for (const playerGame of playerGames) {
		if (parseFloat(currentGame.season) - parseFloat(playerGame.season) === 1) {
			totalPointsLastSeason += parseInt(playerGame.points);
		} else if (parseFloat(currentGame.season) - parseFloat(playerGame.season) < 1) {
			break;
		}
	}

	return (totalPointsLastSeason / totalGamesPlayerLastSeason).toString();
};

const calculateAverageStatRankForPosition = (game: PlayerGameModel, position: PositionNames): number => {
	let average = 0;
	let mean1 = 0;
	let mean2 = 0;
	let sum1 = 0;
	let sum2 = 0;

	try {
		switch (position) {
			case "QB":
				if (game.statRankings.Passing) {
					sum1 +=
						game.statRankings.Passing.int +
						game.statRankings.Passing.passAttempts +
						game.statRankings.Passing.passTD +
						game.statRankings.Passing.passYds;
					mean1 = sum1 / 4;
				}
				// if (game.statRankings.Rushing) {
				// 	sum2 +=
				// 		game.statRankings.Rushing.carries + game.statRankings.Rushing.rushTD + game.statRankings.Rushing.rushYds;
				// 	mean2 = sum2 / 3;
				// }
				average = 1 * mean1;
				break;
			case "RB":
			case "FB":
				if (game.statRankings.Rushing) {
					sum1 +=
						game.statRankings.Rushing.carries + game.statRankings.Rushing.rushTD + game.statRankings.Rushing.rushYds;
					mean1 = sum1 / 3;
				}
				if (game.statRankings.Receiving) {
					sum2 +=
						game.statRankings.Receiving.recTD +
						game.statRankings.Receiving.recYds +
						game.statRankings.Receiving.receptions +
						game.statRankings.Receiving.targets;
					mean2 = sum2 / 4;
				}
				average = 0.6 * mean1 + 0.4 * mean2;
				break;
			case "WR":
			case "TE":
				if (game.statRankings.Receiving) {
					sum1 +=
						game.statRankings.Receiving.recTD +
						game.statRankings.Receiving.recYds +
						game.statRankings.Receiving.receptions +
						game.statRankings.Receiving.targets;
					mean1 = sum1 / 4;
				}
				average = 1 * mean1;
				break;
			case "K":
				if (game.statRankings.Kicking) {
					sum1 += game.statRankings.Kicking.fgMade + game.statRankings.Kicking.xpMade;
					mean1 = sum1 / 2;
				}
				average = 1 * mean1;
				break;
			case "DEF":
				if (game.statRankings.Defense) {
					sum1 +=
						game.statRankings.Defense.ptsAllowed +
						game.statRankings.Defense.takeaways +
						game.statRankings.Defense.ydsAllowed +
						game.statRankings.Defense.passTDsAllowed +
						game.statRankings.Defense.passYdsAllowed +
						game.statRankings.Defense.rushTDsAllowed +
						game.statRankings.Defense.rushYdsAllowed +
						game.statRankings.Defense.fgAllowed +
						game.statRankings.Defense.xpAllowed;
					mean1 = sum1 / 9;
				}
				average = 1 * mean1;
				break;
			default:
				throw new Error("invalid position");
		}
	} catch (e) {
		console.log(game.id);
	}

	return average;
};

const calculateOppAverageStatRankAgainstPosition = (game: PlayerGameModel, position: PositionNames) => {
	let average = 0;
	let mean1 = 0;
	let mean2 = 0;
	let sum1 = 0;
	let sum2 = 0;

	if (!game.statRankings.Defense) {
		throw new Error("invalid game");
	}

	try {
		switch (position) {
			case "QB":
			case "WR":
			case "TE":
				sum1 = game.statRankings.Defense.passTDsAllowed + game.statRankings.Defense.passYdsAllowed;
				average = sum1 / 2;
				break;
			case "RB":
			case "FB":
				sum1 = game.statRankings.Defense.passTDsAllowed + game.statRankings.Defense.passYdsAllowed;
				mean1 = sum1 / 2;

				sum2 = game.statRankings.Defense.rushTDsAllowed + game.statRankings.Defense.rushYdsAllowed;
				mean2 = sum2 / 2;

				average = 0.4 * mean1 + 0.6 * mean2;
				break;
			case "K":
				sum1 = game.statRankings.Defense.fgAllowed + game.statRankings.Defense.xpAllowed;
				average = sum1 / 2;
				break;
			case "DEF":
				// TODO - figure this out
				break;
			default:
				throw new Error("invalid position");
		}
	} catch (e) {
		console.log(game.id);
	}

	return average;
};

const calculateAveragePointsOfLast5Games = (
	currentGame: PlayerGameModel,
	playerGames: Array<PlayerGameModel>
): number => {
	let total = 0;

	const currentGameIndex = playerGames.indexOf(currentGame);
	const startIndex = currentGameIndex < 5 ? 0 : currentGameIndex - 5;

	if (currentGameIndex < 1) return 0;

	for (let i = startIndex; i < currentGameIndex; i++) {
		total += parseFloat(playerGames[i].points);
	}

	return total / (currentGameIndex - startIndex);
};

class LinRegModel {
	pgID!: string;
	pID!: string;
	seasonWeek!: string;
	pos!: number;
	avgPPG!: number;
	avgPPGL5!: number;
	avgPosRank!: number;
	oppAvgPPG!: number;
	oppAvgRankAgainstPos!: number;
	actual!: number;
	isHome!: number;
}
