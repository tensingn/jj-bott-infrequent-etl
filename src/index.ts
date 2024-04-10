import "dotenv/config";
import * as ff from "@google-cloud/functions-framework";
import { Collection, STANDARD } from "@tensingn/firebary";
import { PlayerModel } from "@tensingn/son-of-botker-models";

ff.http("getAllPlayers", (req: ff.Request, res: ff.Response) => {
	const collection: Collection = new Collection(
		{
			projectId: process.env.GCP_PROJECTID,
			keyFilename: process.env.GCP_KEYFILENAME,
			ignoreUndefinedProperties: true,
		},
		[PlayerModel],
		"players"
	);

	collection.getCollection<PlayerModel>(STANDARD).then((col) => res.send(col));
});
