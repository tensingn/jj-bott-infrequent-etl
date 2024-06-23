import { NFLGameModel, NFLTeamModel, PlayerGameModel, PlayerModel, TeamModel } from "@tensingn/jj-bott-models";
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

	async updatePlayerGames(playerGames: Array<PlayerGameModel>) {
		await this.dataAPI.init();
		const promises = new Array<Promise<void>>();

		for (let i = 0; i < playerGames.length; i += 500) {
			promises.push(this.dataAPI.bulkUpdateSubEntity("players", null, "playerGames", playerGames.slice(i, i + 500)));
		}

		await Promise.all(promises);
	}

	async loadGames(games: Array<NFLGameModel>) {
		await this.dataAPI.init();
		await this.dataAPI.bulkCreate("nflGames", games);
	}
}
