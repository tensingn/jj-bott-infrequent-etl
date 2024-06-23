import {
	MatchupModel,
	NFLTeamModel,
	PlayerGameModel,
	PlayerModel,
	SeasonModel,
	TeamModel,
	UserModel,
} from "@tensingn/jj-bott-models";
import { DataAPIService } from "@tensingn/jj-bott-services";

export class Loader {
	private readonly dataAPI: DataAPIService;

	constructor(dataAPIURL: string) {
		this.dataAPI = new DataAPIService(dataAPIURL);
	}

	async loadTeams(nflTeams: Array<NFLTeamModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkUpdate("nflTeams", nflTeams);
	}

	async loadPlayers(players: Array<PlayerModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkCreate("players", players);
	}

	async loadPlayerGamesForMultiplePlayers(playerPlayerGamesMap: Map<string, Array<PlayerGameModel>>) {
		await this.dataAPI.init();

		const requests: Array<Promise<void>> = [];
		playerPlayerGamesMap.forEach((playerGames, playerID) => {
			requests.push(this.dataAPI.bulkCreateSubEntity("players", playerID, "playerGames", playerGames));
		});

		await Promise.all(requests);
	}

	async loadPlayerGames(playerID: string, playerGames: Array<PlayerGameModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkCreateSubEntity("players", playerID, "playerGames", playerGames);
	}

	async test() {
		await this.dataAPI.init();
		return this.dataAPI.findMany<NFLTeamModel>("nflTeams");
	}

	async loadSeasons(seasons: Array<SeasonModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkCreate("seasons", seasons);
	}

	async loadUsers(users: Array<UserModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkCreate("users", users);
	}

	async loadMatchups(matchups: Array<MatchupModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkCreate("matchups", matchups);
	}

	async loadTeamModels(teams: Array<TeamModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkCreate("teams", teams);
	}
}
