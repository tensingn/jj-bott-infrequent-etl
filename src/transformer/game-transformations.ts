import { NFLGameModel, NFLTeamModel } from "@tensingn/jj-bott-models";
import { GameTankModel } from "@tensingn/jj-bott-services";

export const tankGamesAndNFLTeamsToGameModels = (
	tankGames: Array<GameTankModel>,
	nflTeams: Array<NFLTeamModel>
): Array<NFLGameModel> => {
	return tankGames.map((game) => {
		return {
			id: game.gameID,
			homeTeamName: nflTeams.find((team) => team.id === game.teamIDHome)!
				.teamName,
			awayTeamName: nflTeams.find((team) => team.id === game.teamIDAway)!
				.teamName,
			season: game.season,
			week: game.gameWeek.includes(" ")
				? game.gameWeek.split(" ")[1]
				: game.gameWeek,
		};
	});
};
