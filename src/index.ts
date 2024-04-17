import "dotenv/config";
import * as ff from "@google-cloud/functions-framework";
import { Extractor } from "./extractor/extractor";
import { nflTeamTankModelsToNFLTeamModelWithGames } from "./transformer/nfl-team-transformations";
import { Loader } from "./loader/loader";

ff.http("getAllNFLTeams", async (req: ff.Request, res: ff.Response) => {
	let extractor = new Extractor(process.env.TANK_KEY!);
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

		res.sendStatus(200);
	} catch (e) {
		console.log(e);
		res.sendStatus(500);
	}
});
