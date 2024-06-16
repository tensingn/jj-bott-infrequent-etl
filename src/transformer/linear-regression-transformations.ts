import {
	PlayerGameModel,
	PlayerModel,
	PositionNames,
} from "@tensingn/jj-bott-models";

export const playerModelsAndPlayerGameModelsToLinRegData = (
	playerModels: Array<PlayerModel>,
	playerGameModels: Array<PlayerGameModel>
): Array<Array<string>> => {
	const playerModelAndPlayerGamesMap = new Map<
		PlayerModel,
		Array<PlayerGameModel>
	>();
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
		(playerPlayerGameModels: Array<PlayerGameModel>) => {
			playerPlayerGameModels.sort((game1, game2) => {
				let game1DateNum = parseInt(game1.gameID?.split("_")[0]);
				let game2DateNum = parseInt(game2.gameID?.split("_")[0]);

				game1DateNum = typeof game1DateNum === "number" ? game1DateNum : 0;
				game2DateNum = typeof game2DateNum === "number" ? game2DateNum : 0;

				return game1DateNum - game2DateNum;
			});
		}
	);

	const linRegData = new Array<Array<string>>();
	playerModelAndPlayerGamesMap.forEach(
		(
			playerPlayerGameModels: Array<PlayerGameModel>,
			playerModel: PlayerModel
		) => {
			playerPlayerGameModels.forEach((game, index) => {
				// pos, avg ppg this season, avg ppg last season, opp avg ppg this season, actual pts
				const values = new Array<string>(5);

				// pos
				values[0] = determinePrimaryPositionInGame(playerModel, game);

				// avg ppg this season
				values[1] = determineAveragePointsPerGameThisSeason(
					game,
					playerPlayerGameModels
				);

				// avg ppg last season
				values[2] = determineAveragePointsPerGameLastSeason(
					game,
					playerPlayerGameModels
				);

				// opp avg ppg this season
				const opponentID = game.opponent;
				const opponent = playerModels.find((p) => p.id === opponentID);
				if (!opponent) {
					console.log("no opponent for " + game.id);
				} else {
					const opponentGames =
						playerModelAndPlayerGamesMap.get(opponent) ?? [];
					values[3] = determineAveragePointsPerGameThisSeason(
						game,
						opponentGames
					);
				}

				// actual score
				values[4] = game.points;

				linRegData.push(values);
			});
		}
	);

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

	if (
		passYds >= rushYds &&
		passYds >= recYds &&
		playerModel.positions.includes("QB")
	) {
		position = "QB";
	}

	if (
		rushYds >= passYds &&
		rushYds >= recYds &&
		playerModel.positions.includes("RB")
	) {
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

const determineAveragePointsPerGameThisSeason = (
	currentGame: PlayerGameModel,
	playerGames: Array<PlayerGameModel>
): string => {
	let totalPointsThisSeason = 0;
	let gamesBeforeCurrentGame = 0;

	for (const playerGame of playerGames) {
		if (playerGame.gameID === currentGame.gameID) {
			break;
		}

		if (determineGameSeason(currentGame) === determineGameSeason(playerGame)) {
			totalPointsThisSeason += parseInt(playerGame.points);
			gamesBeforeCurrentGame++;
		}
	}

	return (totalPointsThisSeason / (gamesBeforeCurrentGame || 1)).toString();
};

const determineAveragePointsPerGameLastSeason = (
	currentGame: PlayerGameModel,
	playerGames: Array<PlayerGameModel>
): string => {
	const currentGameSeason = determineGameSeason(currentGame);
	if (currentGameSeason === determineGameSeason(playerGames[0])) return "0";

	let totalPointsLastSeason = 0;
	for (const playerGame of playerGames) {
		if (currentGameSeason - determineGameSeason(playerGame) === 1) {
			totalPointsLastSeason += parseInt(playerGame.points);
		} else if (currentGameSeason - determineGameSeason(playerGame) < 1) {
			break;
		}
	}

	return (totalPointsLastSeason / 17).toString();
};

const determineGameSeason = (game: PlayerGameModel): number => {
	const playerGameYear = parseInt(game.gameID.split("_")[0].slice(0, 4));
	const playerGameMonth = parseInt(game.gameID.split("_")[0].slice(4, 6));

	return playerGameMonth > 7 ? playerGameYear : playerGameYear - 1;
};
