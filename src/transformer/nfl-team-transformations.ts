import { NFLTeamModel, NFLTeamNames } from "@tensingn/jj-bott-models";
import {
	GameTankModel,
	NFLTeamTankModel,
	ScheduleTankModel,
} from "@tensingn/jj-bott-services";
import { NFLTeamTankNames } from "@tensingn/jj-bott-services/cjs/tank/names/nfl-team.tank.names";

export const nflTeamTankModelToNFLTeamModel = (
	nflTeamTankModel: NFLTeamTankModel
): NFLTeamModel => {
	const nflTeamModel = new NFLTeamModel();
	nflTeamModel.id = nflTeamTankModel.teamID;

	nflTeamModel.teamName = nflTeamTankNameToNFLTeamName(
		nflTeamTankModel.teamAbv
	);

	return nflTeamModel;
};

export const gameTankModelsToGameIDs = (
	gameTankModels: Array<GameTankModel>,
	onlyRegularSeason: boolean = true
): Array<string> => {
	return onlyRegularSeason
		? gameTankModels
				.filter((gtm) => gtm.seasonType === "Regular Season")
				.map((gtm) => gtm.gameID)
		: gameTankModels.map((gtm) => gtm.gameID);
};

export const nflTeamTankModelToNFLTeamModelWithGames = (
	nflTeamTankModel: NFLTeamTankModel,
	gameTankModels: Array<GameTankModel>,
	onlyRegularSeason: boolean = true
): NFLTeamModel => {
	const nflTeamModel = nflTeamTankModelToNFLTeamModel(nflTeamTankModel);
	nflTeamModel.gameIDs = gameTankModelsToGameIDs(
		gameTankModels,
		onlyRegularSeason
	);
	return nflTeamModel;
};

export const nflTeamTankModelsToNFLTeamModelWithGames = (
	nflTeamTankModels: Array<NFLTeamTankModel>,
	scheduleTankModels: Array<ScheduleTankModel>,
	onlyRegularSeason: boolean = true
): Array<NFLTeamModel> => {
	const nflTeamModels = new Array<NFLTeamModel>();

	for (const nflTeamTankModel of nflTeamTankModels) {
		let schedulesForTeam = scheduleTankModels.filter(
			(stm) => stm.team === nflTeamTankModel.teamAbv
		);

		nflTeamModels.push(
			nflTeamTankModelToNFLTeamModelWithGames(
				nflTeamTankModel,
				schedulesForTeam.map((s) => s.schedule).flat(),
				onlyRegularSeason
			)
		);
	}

	return nflTeamModels;
};

export const nflTeamTankNameToNFLTeamName = (
	nflTeamTankName: NFLTeamTankNames
): NFLTeamNames => {
	if (nflTeamTankName === "WSH") {
		return "WAS";
	}

	return nflTeamTankName;
};
