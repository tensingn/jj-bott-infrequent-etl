import "dotenv/config";
import { Extractor } from "./extractor/extractor";
import { nflTeamTankModelsToNFLTeamModelWithGames } from "./transformer/nfl-team-transformations";
import { Loader } from "./loader/loader";
import { PlayerGameModel, PlayerModel, PositionNamesArray } from "@tensingn/jj-bott-models";
import {
	dstMapToPlayerModelAndPlayerGamesMap,
	gamesAndPlayerModelsToPlayerGamesMap,
	nflTeamModelsAndGameMapToPlayerModelAndPlayerGameMap,
	nflTeamToDSTPlayerModels,
	sleeperAndTankPlayerModelsToPlayerModels,
} from "./transformer/player-transformations";
import { playerModelsAndPlayerGameModelsToLinRegData } from "./transformer/linear-regression-transformations";

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
	const playerModels = await extractor.getAllPlayerModels(1000, ["QB", "RB", "FB", "WR", "TE", "K"]);

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

async function exportDataForLinearRegression() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	// const playerModels = await extractor.getAllPlayerModels();
	// const playerGameModels = await extractor.getAllPlayerGameModels(false);
	const playerModels = extractor.readObjFromFile<Array<PlayerModel>>("./output/playerModels.json");
	const playerGameModels = extractor.readObjFromFile<Array<PlayerGameModel>>("./output/playerGameModels.json");

	// transform - into matrix of parameters
	const linRegData = playerModelsAndPlayerGameModelsToLinRegData(playerModels, playerGameModels);

	// load - into file
	const loader = new Loader(process.env.DATA_API_URL!);
	loader.writeObjToFile("../../training/data/lin-reg-data-last5.json", linRegData);
}

async function getAllGames() {
	// extract
	const extractor = new Extractor(process.env.TANK_KEY!, process.env.DATA_API_URL_LOCAL!);
	const gamesWithWeek = await extractor.getAllNFLGamesWithWeek();
	const nflTeams = await extractor.getAllNFLTeamModels();

	// transform
	//const gameModels = tankGamesAndNFLTeamsToGameModels(gamesWithWeek, nflTeams);

	// load
	try {
		const loader = new Loader(process.env.DATA_API_URL_LOCAL!);
		//	await loader.loadGames(gameModels);
		console.log("done");
	} catch (e) {
		console.log("error:");
		console.log(e);
	}
}

getAllGames().then(() => {});
