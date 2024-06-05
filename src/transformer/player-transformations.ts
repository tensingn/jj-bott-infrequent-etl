import {
	NFLTeamModel,
	NFLTeamNames,
	PlayerGameModel,
	PlayerModel,
	PlayerSleeperModel,
	ScoringSettings,
} from "@tensingn/jj-bott-models";
import { PlayerStatsModel } from "@tensingn/jj-bott-models/cjs/models/player-stats.model";
import { SeasonStatsModel } from "@tensingn/jj-bott-models/cjs/models/season-stats.model";
import { GameTankModel, PlayerGameTankModel } from "@tensingn/jj-bott-services";
import { PlayerTankModel } from "@tensingn/jj-bott-services/cjs/tank/models/player.tank.model";

export const sleeperAndTankPlayerModelsToPlayerModels = (
	sleeperAndTankPlayerModels: Array<{
		sleeperPlayer: PlayerSleeperModel;
		tankPlayer: PlayerTankModel | null;
	}>
): Array<PlayerModel> => {
	return sleeperAndTankPlayerModels.map((stp) => {
		const playerModel = new PlayerModel();
		playerModel.id = stp.sleeperPlayer.player_id;
		playerModel.firstName = stp.sleeperPlayer.first_name;
		playerModel.lastName = stp.sleeperPlayer.last_name;
		playerModel.fullName = stp.sleeperPlayer.full_name;
		playerModel.team = stp.sleeperPlayer.team;
		playerModel.positions = stp.sleeperPlayer.fantasy_positions;
		playerModel.status = stp.sleeperPlayer.status;
		playerModel.tankID = stp.tankPlayer?.playerID ?? "-1";
		playerModel.seasonStats = stp.tankPlayer?.stats ?? new SeasonStatsModel();

		return playerModel;
	});
};

export const nflTeamToDSTPlayerModels = (nflTeams: Array<NFLTeamModel>) => {
	return nflTeams.map((nflTeam) => {
		const playerModel = new PlayerModel();
		playerModel.id = nflTeam.teamName;
		playerModel.firstName = "DST";
		playerModel.lastName = nflTeam.teamName;
		playerModel.team = nflTeam.teamName;
		playerModel.positions = ["DEF"];
		playerModel.status = "Active";
		playerModel.tankID = "-1";
		playerModel.seasonStats = new SeasonStatsModel();

		return playerModel;
	});
};

export const nflTeamModelsAndGameMapToPlayerModelAndPlayerGameMap = (map: {
	nflTeamModels: Array<NFLTeamModel>;
	gameMap: Map<NFLTeamNames, Array<GameTankModel>>;
}): Map<NFLTeamModel, Array<GameTankModel>> => {
	const { nflTeamModels, gameMap } = map;
	const returnMap = new Map<NFLTeamModel, Array<GameTankModel>>();

	nflTeamModels.forEach((team) => {
		returnMap.set(team, gameMap.get(team.teamName) ?? []);
	});

	return returnMap;
};

export const dstMapToPlayerModelAndPlayerGamesMap = (
	dstMap: Map<NFLTeamModel, Array<GameTankModel>>
) => {
	const map = new Map<string, Array<PlayerGameModel>>();
	const nflTeams = Array.from(dstMap.keys());

	dstMap.forEach((games: Array<GameTankModel>, nflTeam: NFLTeamModel) => {
		map.set(
			nflTeam.teamName,
			games.map((game) => {
				const dst =
					game.DST.home.teamID === nflTeam.id ? game.DST.home : game.DST.away;

				const playerGameModel = new PlayerGameModel();
				playerGameModel.playerID = nflTeam.teamName;
				playerGameModel.gameID = game.gameID;
				playerGameModel.opponent =
					game.teamIDHome === nflTeam.id
						? nflTeams.find((t) => t.id === game.teamIDAway)!.teamName
						: nflTeams.find((t) => t.id === game.teamIDHome)!.teamName;

				let points = 0;

				// yards allowed
				const ydsAllowedParsed = parseInt(dst.ydsAllowed ?? 0);
				if (ydsAllowedParsed < 100) {
					points += ScoringSettings.yds_allow_0_100;
				} else if (ydsAllowedParsed < 200) {
					points += ScoringSettings.yds_allow_100_199;
				} else if (ydsAllowedParsed < 300) {
					points += ScoringSettings.yds_allow_200_299;
				} else if (ydsAllowedParsed < 350) {
					points += ScoringSettings.yds_allow_300_349;
				} else if (ydsAllowedParsed < 400) {
					points -= ScoringSettings.yds_allow_350_399;
				} else if (ydsAllowedParsed < 450) {
					points -= ScoringSettings.yds_allow_400_449;
				} else if (ydsAllowedParsed < 500) {
					points -= ScoringSettings.yds_allow_450_499;
				} else if (ydsAllowedParsed < 550) {
					points -= ScoringSettings.yds_allow_500_549;
				} else {
					points -= ScoringSettings.yds_allow_550p;
				}

				// points allowed
				const ptsAllowedParsed = parseInt(dst.ptsAllowed ?? 0);
				if (ptsAllowedParsed < 1) {
					points += ScoringSettings.pts_allow_0;
				} else if (ptsAllowedParsed < 7) {
					points += ScoringSettings.pts_allow_1_6;
				} else if (ptsAllowedParsed < 14) {
					points += ScoringSettings.pts_allow_7_13;
				} else if (ptsAllowedParsed < 21) {
					points += ScoringSettings.pts_allow_14_20;
				} else if (ptsAllowedParsed < 28) {
					points += ScoringSettings.pts_allow_21_27;
				} else if (ptsAllowedParsed < 35) {
					points += ScoringSettings.pts_allow_28_34;
				} else {
					points += ScoringSettings.pts_allow_35p;
				}

				// TDs
				const defTDParsed = parseInt(dst.defTD ?? 0);
				points += defTDParsed * ScoringSettings.def_td;

				// sacks
				const sacksParsed = parseInt(dst.sacks ?? 0);
				points += sacksParsed * ScoringSettings.sack;

				// interceptions
				const defensiveInterceptionsParsed = parseInt(
					dst.defensiveInterceptions ?? 0
				);
				points += defensiveInterceptionsParsed * ScoringSettings.int;

				// fumble recoveries
				const fumblesRecoveredParsed = parseInt(dst.fumblesRecovered ?? 0);
				points += fumblesRecoveredParsed * ScoringSettings.fum_rec;

				// safeties
				const safetiesParsed = parseInt(dst.safeties ?? 0);
				points += safetiesParsed * ScoringSettings.safe;

				// forced fumbles
				const playerGames: Array<PlayerGameTankModel> = Object.values(
					game.playerStats
				);
				for (let playerGame of playerGames) {
					if (playerGame.teamID !== nflTeam.id && playerGame.Defense?.fumbles) {
						points += ScoringSettings.ff;
					}
				}

				playerGameModel.points = points.toString();

				return playerGameModel;
			})
		);
	});

	return map;
};
