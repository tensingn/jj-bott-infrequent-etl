import "dotenv/config";
import { Extractor } from "./extractor/extractor";
import { nflTeamTankModelsToNFLTeamModelWithGames } from "./transformer/nfl-team-transformations";
import { Loader } from "./loader/loader";
import { PlayerGameModel, PlayerModel, PlayerSleeperModel, PositionNamesArray } from "@tensingn/jj-bott-models";
import {
	dstMapToPlayerModelAndPlayerGamesMap,
	gamesAndPlayerModelsToPlayerGamesMap,
	nflTeamModelsAndGameMapToPlayerModelAndPlayerGameMap,
	nflTeamToDSTPlayerModels,
	sleeperAndTankPlayerModelsToPlayerModels,
} from "./transformer/player-transformations";
import {
	addingTeamWeekAndSeasonToPlayerGames,
	addingWeeklyRankingsToPlayerGames,
	arrangePlayerGamesByWeek,
	tankGamesAndNFLTeamsToGameModels,
} from "./transformer/game-transformations";
import { sleeperMatchupsToMatchupModels, sleeperRostersToTeamModels, sleeperSeasonsToSeasonModels, sleeperUsersToUserModels } from "./transformer/league-transformations";


async function getAllNFLTeams() {
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL!);
	const { nflTeams, schedules } = await extractor.getAllNFLTeamsAndSchedules(2);
	console.log("retrieved teams and schedules");

	const nflTeamModels = nflTeamTankModelsToNFLTeamModelWithGames(nflTeams, schedules);
	console.log("converted to teams");

	try {
		const loader = new Loader(process.env.DATA_API_URL!);
		await loader.loadTeams(nflTeamModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllPlayers() {
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL!);
	const sleeperAndTankPlayers = await extractor.getAllPlayers(
		PositionNamesArray.map((p) => p),
		true
	);

	const playerModels = sleeperAndTankPlayerModelsToPlayerModels(sleeperAndTankPlayers);

	try {
		const loader = new Loader(process.env.DATA_API_URL!);
		await loader.loadPlayers(playerModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllDefenses() {
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL!);

	let nflTeamModelsAndGameMap = await extractor.getDSTGamesForEachNFLTeam();

	const dstPlayers = nflTeamToDSTPlayerModels(nflTeamModelsAndGameMap.nflTeamModels);

	try {
		const loader = new Loader(process.env.DATA_API_URL!);
		await loader.loadPlayers(dstPlayers);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllDefenseGames() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL!);
	const nflTeamModelsAndGameMap = await extractor.getDSTGamesForEachNFLTeam();

	// transform
	const nflTeamModelGameMap = nflTeamModelsAndGameMapToPlayerModelAndPlayerGameMap(nflTeamModelsAndGameMap);
	const playerIDAndPlayerGamesMap = dstMapToPlayerModelAndPlayerGamesMap(nflTeamModelGameMap);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL!);
		await loader.loadPlayerGamesForMultiplePlayers(playerIDAndPlayerGamesMap);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllPlayerGames() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL!);
	const nflTeamModelsAndGameMap = await extractor.getDSTGamesForEachNFLTeam(true);
	const playerModels = await extractor.getAllPlayerModels();

	// transform
	const games = Array.from(nflTeamModelsAndGameMap.gameMap.values()).flat();
	const playerIDAndPlayerGamesMap = gamesAndPlayerModelsToPlayerGamesMap(
		games,
		playerModels,
		nflTeamModelsAndGameMap.nflTeamModels
	);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL!);
		await loader.loadPlayerGamesForMultiplePlayers(playerIDAndPlayerGamesMap);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllGames() {
	// extract
	const extractor = new Extractor(process.env.FAKE_TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const gamesWithWeek = await extractor.getAllNFLGamesWithWeek();
	const nflTeams = await extractor.getAllNFLTeamModels();

	// transform
	const gameModels = tankGamesAndNFLTeamsToGameModels(gamesWithWeek, nflTeams);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		await loader.loadGames(gameModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}
	
async function getAllSleeperSeasons() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const seasons = await extractor.getAllSeasons();

	// transform
	const seasonModels = sleeperSeasonsToSeasonModels(seasons);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		await loader.loadSeasons(seasonModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function updatePlayerGamesWithWeek() {
	// extract
	const extractor = new Extractor(process.env.FAKE_TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const playerGames = await extractor.getAllPlayerGameModels(["2022", "2023"]);
	const gameModels = await extractor.getAllGameModels();

	// transform
	const updatedPlayerGames = addingTeamWeekAndSeasonToPlayerGames(playerGames, gameModels);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		await loader.updatePlayerGames(updatedPlayerGames);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllSleeperUsers() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const seasons = await extractor.getAllSeasons();
	const users = await extractor.getAllUsers(seasons[0].league_id);

	// transform
	const userModels = sleeperUsersToUserModels(users);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		await loader.loadUsers(userModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getSinglePlayer(tankID: string) {
	// extract
	const extractor = new Extractor(process.env.FAKE_TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const tankPlayer = await extractor.getTankPlayer(tankID);

	const playerModels = sleeperAndTankPlayerModelsToPlayerModels([
		{
			tankPlayer,
			sleeperPlayer: {
				espn_id: "4361529",
				fantasy_positions: ["RB"],
				first_name: "Isiah",
				last_name: "Pacheco",
				full_name: "Isiah Pacheco",
				player_id: "8205",
				status: "Active",
				team: "KC",
			},
		},
	]);

	try {
		const loader = new Loader(process.env.DATA_API_URL!);
		await loader.loadPlayers(playerModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getPlayerGamesForSinglePlayer(playerID: string) {
	// extract
	const extractor = new Extractor(process.env.FAKE_TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const nflTeamModelsAndGameMap = await extractor.getDSTGamesForEachNFLTeam(true);
	const playerModels = [await extractor.getSinglePlayerModel(playerID)];
	playerModels[0].id = playerID;

	// transform
	const games = Array.from(nflTeamModelsAndGameMap.gameMap.values()).flat();
	const playerIDAndPlayerGamesMap = gamesAndPlayerModelsToPlayerGamesMap(
		games,
		playerModels,
		nflTeamModelsAndGameMap.nflTeamModels
	);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL!);
		await loader.loadPlayerGamesForMultiplePlayers(playerIDAndPlayerGamesMap);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function updatePlayerGamesWithRankingData(season: string) {
	// extract
	const extractor = new Extractor(process.env.FAKE_TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const playerGameModels = await extractor.getAllPlayerGameModels([season], false);

	// transform
	const playerGamesByWeek = arrangePlayerGamesByWeek(playerGameModels);
	const playerGamesWithWeeklyRankings = addingWeeklyRankingsToPlayerGames(playerGamesByWeek);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		await loader.updatePlayerGames(playerGamesWithWeeklyRankings);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllSleeperMatchups() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const seasons = await extractor.getAllSeasons();
	const seasonsAndMatchups = await extractor.getAllMatchupsForSeasons(seasons);

	// transform
	const matchupModels = sleeperMatchupsToMatchupModels(seasonsAndMatchups);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		await loader.loadMatchups(matchupModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

async function getAllTeams() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const seasons = await extractor.getAllSeasons();
	const seasonsAndRosters = await extractor.getAllRostersForSeasons(seasons);
	const users = await extractor.getAllUserModels();

	// transform
	const teamModels = sleeperRostersToTeamModels(seasonsAndRosters, users);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		await loader.loadTeamModels(teamModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}
