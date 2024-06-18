import {
	NFLGameModel,
	NFLTeamModel,
	PlayerGameModel,
} from "@tensingn/jj-bott-models";
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
