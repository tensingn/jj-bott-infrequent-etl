import "dotenv/config";
import { Extractor } from "./extractor/extractor";
import { nflTeamTankModelsToNFLTeamModelWithGames } from "./transformer/nfl-team-transformations";
import { Loader } from "./loader/loader";
import { PositionNamesArray } from "@tensingn/jj-bott-models";
import {
	dstMapToPlayerModelAndPlayerGamesMap,
	nflTeamModelsAndGameMapToPlayerModelAndPlayerGameMap,
	nflTeamToDSTPlayerModels,
	sleeperAndTankPlayerModelsToPlayerModels,
} from "./transformer/player-transformations";

async function getAllNFLTeams() {
	const extractor = new Extractor(
		process.env.TANK_KEY!,
		process.env.DATA_API_URL!
	);
	const { nflTeams, schedules } = await extractor.getAllNFLTeamsAndSchedules(2);
	console.log("retrieved teams and schedules");

	const nflTeamModels = nflTeamTankModelsToNFLTeamModelWithGames(
		nflTeams,
		schedules
	);
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
	const extractor = new Extractor(
		process.env.TANK_KEY!,
		process.env.DATA_API_URL!
	);
	const sleeperAndTankPlayers = await extractor.getAllPlayers(
		PositionNamesArray.map((p) => p),
		true
	);

	const playerModels = sleeperAndTankPlayerModelsToPlayerModels(
		sleeperAndTankPlayers
	);

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
	const extractor = new Extractor(
		process.env.TANK_KEY!,
		process.env.DATA_API_URL!
	);

	let nflTeamModelsAndGameMap = await extractor.getDSTGamesForEachNFLTeam();

	const dstPlayers = nflTeamToDSTPlayerModels(
		nflTeamModelsAndGameMap.nflTeamModels
	);

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
	const extractor = new Extractor(
		process.env.TANK_KEY!,
		process.env.DATA_API_URL!
	);
	const nflTeamModelsAndGameMap = await extractor.getDSTGamesForEachNFLTeam();

	// transform
	const nflTeamModelGameMap =
		nflTeamModelsAndGameMapToPlayerModelAndPlayerGameMap(
			nflTeamModelsAndGameMap
		);
	const playerIDAndPlayerGamesMap =
		dstMapToPlayerModelAndPlayerGamesMap(nflTeamModelGameMap);

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

getAllDefenseGames().then(() => {});
