import {
	NFLGameModel,
	NFLTeamModel,
	NFLTeamNamesArray,
	PlayerGameModel,
	PlayerStatsModel,
	StatsRankingModel,
} from "@tensingn/jj-bott-models";
import { GameTankModel } from "@tensingn/jj-bott-services";

export const tankGamesAndNFLTeamsToGameModels = (
	tankGames: Array<GameTankModel>,
	nflTeams: Array<NFLTeamModel>
): Array<NFLGameModel> => {
	return tankGames.map((game) => {
		return {
			id: game.gameID,
			homeTeamName: nflTeams.find((team) => team.id === game.teamIDHome)!.teamName,
			awayTeamName: nflTeams.find((team) => team.id === game.teamIDAway)!.teamName,
			season: game.season,
			week: game.gameWeek.includes(" ") ? game.gameWeek.split(" ")[1] : game.gameWeek,
		};
	});
};

export const addingTeamWeekAndSeasonToPlayerGames = (
	playerGames: Array<PlayerGameModel>,
	gameModels: Array<NFLGameModel>
): Array<PlayerGameModel> => {
	playerGames.forEach((playerGame, index, arr) => {
		const game = gameModels.find((game) => game.id === playerGame.gameID)!;
		const homeTeam = game.homeTeamName;
		const awayTeam = game.awayTeamName;
		arr[index].team = homeTeam === playerGame.opponent ? awayTeam : homeTeam;
		arr[index].week = game.week;
		arr[index].season = game.season;
	});

	return playerGames;
};

export const addingIsHomeToPlayerGames = (
	playerGames: Array<PlayerGameModel>,
	gameModels: Array<NFLGameModel>
): Array<PlayerGameModel> => {
	playerGames.forEach((playerGame, index, arr) => {
		const game = gameModels.find((game) => game.id === playerGame.gameID)!;
		const homeTeam = game.homeTeamName;
		const awayTeam = game.awayTeamName;
		arr[index].isHome = homeTeam !== playerGame.opponent;
	});

	return playerGames;
};

export const arrangePlayerGamesByWeek = (playerGames: Array<PlayerGameModel>): Map<string, Array<PlayerGameModel>> => {
	const map = new Map<string, Array<PlayerGameModel>>();

	playerGames.forEach((game) => {
		const weekNum = parseInt(game.week);
		if (isNaN(weekNum) || weekNum > 18 || weekNum < 1) {
			throw new Error("invalid week");
		}

		if (map.has(game.week)) {
			map.get(game.week)?.push(game);
		} else {
			map.set(game.week, [game]);
		}
	});

	return map;
};

export const addingWeeklyRankingsToPlayerGames = (
	playerGamesMap: Map<string, Array<PlayerGameModel>>
): Array<PlayerGameModel> => {
	const gamesWithRankings = new Array<PlayerGameModel>();

	const playerStatsByStatColumn = new StatColumns();
	for (let weekNum = 1; weekNum < 19; weekNum++) {
		const week = weekNum.toString();

		const gamesThisWeek = playerGamesMap.get(week);

		if (!gamesThisWeek) {
			throw new Error("invalid week");
		}

		playerStatsByStatColumn.sortAllStatsColumns();
		gamesThisWeek.forEach((game, i, arr) => {
			const rankings = new StatsRankingModel();
			if (!isDefensePlayerGame(game)) {
				if (!(game.stats.Kicking?.fgAttempts || game.stats.Kicking?.xpAttempts)) {
					// rushing
					const rushYdsIndex = playerStatsByStatColumn.rushYds.findIndex((pas) => pas.playerID === game.playerID);
					const carriesIndex = playerStatsByStatColumn.carries.findIndex((pas) => pas.playerID === game.playerID);
					const rushTDIndex = playerStatsByStatColumn.rushTD.findIndex((pas) => pas.playerID === game.playerID);

					rankings.Rushing = {
						rushYds:
							rushYdsIndex >= 0 ? rushYdsIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.rushYds.length,
						carries:
							carriesIndex >= 0 ? carriesIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.carries.length,
						rushTD: rushTDIndex >= 0 ? rushTDIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.rushTD.length,
					};

					if (rushYdsIndex >= 0) {
						playerStatsByStatColumn.rushYds[rushYdsIndex].stat += parseInt(game.stats.Rushing?.rushYds ?? "0");
					} else {
						playerStatsByStatColumn.rushYds.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Rushing?.rushYds ?? "0"),
						});
					}

					if (carriesIndex >= 0) {
						playerStatsByStatColumn.carries[carriesIndex].stat += parseInt(game.stats.Rushing?.carries ?? "0");
					} else {
						playerStatsByStatColumn.carries.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Rushing?.carries ?? "0"),
						});
					}

					if (rushTDIndex >= 0) {
						playerStatsByStatColumn.rushTD[rushTDIndex].stat += parseInt(game.stats.Rushing?.rushTD ?? "0");
					} else {
						playerStatsByStatColumn.rushTD.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Rushing?.rushTD ?? "0"),
						});
					}

					// passing
					const passAttemptsIndex = playerStatsByStatColumn.passAttempts.findIndex(
						(pas) => pas.playerID === game.playerID
					);
					const passYdsIndex = playerStatsByStatColumn.passYds.findIndex((pas) => pas.playerID === game.playerID);
					const passTDIndex = playerStatsByStatColumn.passTD.findIndex((pas) => pas.playerID === game.playerID);
					const intIndex = playerStatsByStatColumn.int.findIndex((pas) => pas.playerID === game.playerID);

					rankings.Passing = {
						passAttempts:
							passAttemptsIndex >= 0
								? passAttemptsIndex + 1
								: game.week === "1"
								? -1
								: playerStatsByStatColumn.passAttempts.length,
						passYds:
							passYdsIndex >= 0 ? passYdsIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.passYds.length,
						passTD: passTDIndex >= 0 ? passTDIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.passTD.length,
						int: intIndex >= 0 ? intIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.int.length,
					};

					if (passAttemptsIndex >= 0) {
						playerStatsByStatColumn.passAttempts[passAttemptsIndex].stat += parseInt(
							game.stats.Passing?.passAttempts ?? "0"
						);
					} else {
						playerStatsByStatColumn.passAttempts.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Passing?.passAttempts ?? "0"),
						});
					}

					if (passYdsIndex >= 0) {
						playerStatsByStatColumn.passYds[passYdsIndex].stat += parseInt(game.stats.Passing?.passYds ?? "0");
					} else {
						playerStatsByStatColumn.passYds.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Passing?.passYds ?? "0"),
						});
					}

					if (passTDIndex >= 0) {
						playerStatsByStatColumn.passTD[passTDIndex].stat += parseInt(game.stats.Passing?.passTD ?? "0");
					} else {
						playerStatsByStatColumn.passTD.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Passing?.passTD ?? "0"),
						});
					}

					if (intIndex >= 0) {
						playerStatsByStatColumn.int[intIndex].stat += parseInt(game.stats.Passing?.int ?? "0");
					} else {
						playerStatsByStatColumn.int.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Passing?.int ?? "0"),
						});
					}

					// receiving
					const recYdsIndex = playerStatsByStatColumn.recYds.findIndex((pas) => pas.playerID === game.playerID);
					const recTDIndex = playerStatsByStatColumn.recTD.findIndex((pas) => pas.playerID === game.playerID);
					const receptionsIndex = playerStatsByStatColumn.receptions.findIndex((pas) => pas.playerID === game.playerID);
					const targetsIndex = playerStatsByStatColumn.targets.findIndex((pas) => pas.playerID === game.playerID);

					rankings.Receiving = {
						recYds: recYdsIndex >= 0 ? recYdsIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.recYds.length,
						recTD: recTDIndex >= 0 ? recTDIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.recTD.length,
						receptions:
							receptionsIndex >= 0
								? receptionsIndex + 1
								: game.week === "1"
								? -1
								: playerStatsByStatColumn.receptions.length,
						targets:
							targetsIndex >= 0 ? targetsIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.targets.length,
					};

					if (recYdsIndex >= 0) {
						playerStatsByStatColumn.recYds[recYdsIndex].stat += parseInt(game.stats.Receiving?.recYds ?? "0");
					} else {
						playerStatsByStatColumn.recYds.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Receiving?.recYds ?? "0"),
						});
					}

					if (recTDIndex >= 0) {
						playerStatsByStatColumn.recTD[recTDIndex].stat += parseInt(game.stats.Receiving?.recTD ?? "0");
					} else {
						playerStatsByStatColumn.recTD.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Receiving?.recTD ?? "0"),
						});
					}

					if (receptionsIndex >= 0) {
						playerStatsByStatColumn.receptions[receptionsIndex].stat += parseInt(
							game.stats.Receiving?.receptions ?? "0"
						);
					} else {
						playerStatsByStatColumn.receptions.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Receiving?.receptions ?? "0"),
						});
					}

					if (targetsIndex >= 0) {
						playerStatsByStatColumn.targets[targetsIndex].stat += parseInt(game.stats.Receiving?.targets ?? "0");
					} else {
						playerStatsByStatColumn.targets.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Receiving?.targets ?? "0"),
						});
					}
				}

				// kicking
				else {
					const fgMadeIndex = playerStatsByStatColumn.fgMade.findIndex((pas) => pas.playerID === game.playerID);
					const xpMadeIndex = playerStatsByStatColumn.xpMade.findIndex((pas) => pas.playerID === game.playerID);

					rankings.Kicking = {
						fgMade: fgMadeIndex >= 0 ? fgMadeIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.fgMade.length,
						xpMade: xpMadeIndex >= 0 ? xpMadeIndex + 1 : game.week === "1" ? -1 : playerStatsByStatColumn.xpMade.length,
					};

					if (fgMadeIndex >= 0) {
						playerStatsByStatColumn.fgMade[fgMadeIndex].stat += parseInt(game.stats.Kicking.fgMade);
					} else {
						playerStatsByStatColumn.fgMade.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Kicking.fgMade),
						});
					}

					if (xpMadeIndex >= 0) {
						playerStatsByStatColumn.xpMade[xpMadeIndex].stat += parseInt(game.stats.Kicking.xpMade);
					} else {
						playerStatsByStatColumn.xpMade.push({
							playerID: game.playerID,
							stat: parseInt(game.stats.Kicking.xpMade),
						});
					}
				}
			} else if (game.stats.Defense && game.stats.Defense.ydsAllowed && game.stats.Defense.ptsAllowed) {
				const ydsAllowedIndex = playerStatsByStatColumn.ydsAllowed.findIndex((pas) => pas.playerID === game.playerID);
				const ptsAllowedIndex = playerStatsByStatColumn.ptsAllowed.findIndex((pas) => pas.playerID === game.playerID);
				const takeawaysIndex = playerStatsByStatColumn.takeaways.findIndex((pas) => pas.playerID === game.playerID);
				const passYdsAllowedIndex = playerStatsByStatColumn.passYdsAllowed.findIndex(
					(pas) => pas.playerID === game.playerID
				);
				const passTDsAllowedIndex = playerStatsByStatColumn.passTDsAllowed.findIndex(
					(pas) => pas.playerID === game.playerID
				);
				const rushYdsAllowedIndex = playerStatsByStatColumn.rushYdsAllowed.findIndex(
					(pas) => pas.playerID === game.playerID
				);
				const rushTDsAllowedIndex = playerStatsByStatColumn.rushTDsAllowed.findIndex(
					(pas) => pas.playerID === game.playerID
				);
				const fgAllowedIndex = playerStatsByStatColumn.fgAllowed.findIndex((pas) => pas.playerID === game.playerID);
				const xpAllowedIndex = playerStatsByStatColumn.xpAllowed.findIndex((pas) => pas.playerID === game.playerID);

				rankings.Defense = {
					ydsAllowed:
						ydsAllowedIndex >= 0
							? ydsAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.ydsAllowed.length,
					ptsAllowed:
						ptsAllowedIndex >= 0
							? ptsAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.ptsAllowed.length,
					takeaways:
						takeawaysIndex >= 0
							? takeawaysIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.takeaways.length,
					passYdsAllowed:
						passYdsAllowedIndex >= 0
							? passYdsAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.passYdsAllowed.length,
					passTDsAllowed:
						passTDsAllowedIndex >= 0
							? passTDsAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.passTDsAllowed.length,
					rushYdsAllowed:
						rushYdsAllowedIndex >= 0
							? rushYdsAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.rushYdsAllowed.length,
					rushTDsAllowed:
						rushTDsAllowedIndex >= 0
							? rushTDsAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.rushTDsAllowed.length,
					fgAllowed:
						fgAllowedIndex >= 0
							? fgAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.fgAllowed.length,
					xpAllowed:
						xpAllowedIndex >= 0
							? xpAllowedIndex + 1
							: game.week === "1"
							? -1
							: playerStatsByStatColumn.xpAllowed.length,
				};

				if (ydsAllowedIndex >= 0) {
					playerStatsByStatColumn.ydsAllowed[ydsAllowedIndex].stat += parseInt(game.stats.Defense.ydsAllowed ?? "0");
				} else {
					playerStatsByStatColumn.ydsAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.ydsAllowed ?? "0"),
					});
				}

				if (ptsAllowedIndex >= 0) {
					playerStatsByStatColumn.ptsAllowed[ptsAllowedIndex].stat += parseInt(game.stats.Defense.ptsAllowed ?? "0");
				} else {
					playerStatsByStatColumn.ptsAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.ptsAllowed ?? "0"),
					});
				}

				const takeawaysThisGame =
					parseInt(game.stats.Defense.fumblesRecovered ?? "0") +
					parseInt(game.stats.Defense.defensiveInterceptions ?? "0");
				if (takeawaysIndex >= 0) {
					playerStatsByStatColumn.takeaways[takeawaysIndex].stat += takeawaysThisGame;
				} else {
					playerStatsByStatColumn.takeaways.push({
						playerID: game.playerID,
						stat: takeawaysThisGame,
					});
				}

				if (passYdsAllowedIndex >= 0) {
					playerStatsByStatColumn.passYdsAllowed[passYdsAllowedIndex].stat += parseInt(
						game.stats.Defense.passYdsAllowed ?? "0"
					);
				} else {
					playerStatsByStatColumn.passYdsAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.passYdsAllowed ?? "0"),
					});
				}

				if (passTDsAllowedIndex >= 0) {
					playerStatsByStatColumn.passTDsAllowed[passTDsAllowedIndex].stat += parseInt(
						game.stats.Defense.passTDsAllowed ?? "0"
					);
				} else {
					playerStatsByStatColumn.passTDsAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.passTDsAllowed ?? "0"),
					});
				}

				if (rushYdsAllowedIndex >= 0) {
					playerStatsByStatColumn.rushYdsAllowed[rushYdsAllowedIndex].stat += parseInt(
						game.stats.Defense.rushYdsAllowed ?? "0"
					);
				} else {
					playerStatsByStatColumn.rushYdsAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.rushYdsAllowed ?? "0"),
					});
				}

				if (rushTDsAllowedIndex >= 0) {
					playerStatsByStatColumn.rushTDsAllowed[rushTDsAllowedIndex].stat += parseInt(
						game.stats.Defense.rushTDsAllowed ?? "0"
					);
				} else {
					playerStatsByStatColumn.rushTDsAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.rushTDsAllowed ?? "0"),
					});
				}

				if (fgAllowedIndex >= 0) {
					playerStatsByStatColumn.fgAllowed[fgAllowedIndex].stat += parseInt(game.stats.Defense.fgAllowed ?? "0");
				} else {
					playerStatsByStatColumn.fgAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.fgAllowed ?? "0"),
					});
				}

				if (xpAllowedIndex >= 0) {
					playerStatsByStatColumn.xpAllowed[xpAllowedIndex].stat += parseInt(game.stats.Defense.xpAllowed ?? "0");
				} else {
					playerStatsByStatColumn.xpAllowed.push({
						playerID: game.playerID,
						stat: parseInt(game.stats.Defense.xpAllowed ?? "0"),
					});
				}
			}

			arr[i].statRankings = rankings;
			gamesWithRankings.push(arr[i]);
		});
	}

	return gamesWithRankings;
};

export const isDefensePlayerGame = (playerGame: PlayerGameModel) => {
	return [...NFLTeamNamesArray].map((n) => n.toString()).includes(playerGame.playerID);
};

type PlayerAndStat = { playerID: string; stat: number };
class StatColumns {
	rushYds: Array<PlayerAndStat>;
	carries: Array<PlayerAndStat>;
	rushTD: Array<PlayerAndStat>;

	passAttempts: Array<PlayerAndStat>;
	passYds: Array<PlayerAndStat>;
	passTD: Array<PlayerAndStat>;
	int: Array<PlayerAndStat>;

	receptions: Array<PlayerAndStat>;
	recTD: Array<PlayerAndStat>;
	targets: Array<PlayerAndStat>;
	recYds: Array<PlayerAndStat>;

	fgMade: Array<PlayerAndStat>;
	xpMade: Array<PlayerAndStat>;

	takeaways: Array<PlayerAndStat>;
	ydsAllowed: Array<PlayerAndStat>;
	ptsAllowed: Array<PlayerAndStat>;
	passYdsAllowed: Array<PlayerAndStat>;
	rushYdsAllowed: Array<PlayerAndStat>;
	passTDsAllowed: Array<PlayerAndStat>;
	rushTDsAllowed: Array<PlayerAndStat>;
	fgAllowed: Array<PlayerAndStat>;
	xpAllowed: Array<PlayerAndStat>;

	constructor() {
		this.rushYds = [];
		this.carries = [];
		this.rushTD = [];

		this.passAttempts = [];
		this.passYds = [];
		this.passTD = [];
		this.int = [];

		this.receptions = [];
		this.recTD = [];
		this.targets = [];
		this.recYds = [];

		this.fgMade = [];
		this.xpMade = [];

		this.takeaways = [];
		this.ydsAllowed = [];
		this.ptsAllowed = [];
		this.passYdsAllowed = [];
		this.rushYdsAllowed = [];
		this.passTDsAllowed = [];
		this.rushTDsAllowed = [];
		this.fgAllowed = [];
		this.xpAllowed = [];
	}

	// sorting all stat columns in DESCENDING order
	sortAllStatsColumns() {
		this.rushYds.sort((p1, p2) => p2.stat - p1.stat);
		this.carries.sort((p1, p2) => p2.stat - p1.stat);
		this.rushTD.sort((p1, p2) => p2.stat - p1.stat);

		this.passAttempts.sort((p1, p2) => p2.stat - p1.stat);
		this.passYds.sort((p1, p2) => p2.stat - p1.stat);
		this.passTD.sort((p1, p2) => p2.stat - p1.stat);
		this.int.sort((p1, p2) => p1.stat - p2.stat);

		this.receptions.sort((p1, p2) => p2.stat - p1.stat);
		this.recTD.sort((p1, p2) => p2.stat - p1.stat);
		this.targets.sort((p1, p2) => p2.stat - p1.stat);
		this.recYds.sort((p1, p2) => p2.stat - p1.stat);

		this.fgMade.sort((p1, p2) => p2.stat - p1.stat);
		this.xpMade.sort((p1, p2) => p2.stat - p1.stat);

		this.takeaways.sort((p1, p2) => p2.stat - p1.stat);
		this.ydsAllowed.sort((p1, p2) => p1.stat - p2.stat);
		this.ptsAllowed.sort((p1, p2) => p1.stat - p2.stat);
		this.passYdsAllowed.sort((p1, p2) => p1.stat - p2.stat);
		this.rushYdsAllowed.sort((p1, p2) => p1.stat - p2.stat);
		this.passTDsAllowed.sort((p1, p2) => p1.stat - p2.stat);
		this.rushTDsAllowed.sort((p1, p2) => p1.stat - p2.stat);
		this.fgAllowed.sort((p1, p2) => p1.stat - p2.stat);
		this.xpAllowed.sort((p1, p2) => p1.stat - p2.stat);
	}
}
