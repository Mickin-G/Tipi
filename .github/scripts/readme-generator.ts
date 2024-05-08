import { exec } from "child_process";
import fs from "fs";
import { stderr, stdout } from "process";

type App = {
  id: string;
  name: string;
  description: string;
  source: string;
  port: number;
};

const getAppsList = async () => {
  const apps: Record<string, App> = {};
  // fetch apps from app store repo
  const res = await fetch(
    "https://api.github.com/repos/runtipi/runtipi-appstore/contents/apps",
  );

  const data = await res.json();
  const appNames = data.map((app) => app.name);

  for (const app of appNames) {
    const config = await fetch(
      `https://raw.githubusercontent.com/runtipi/runtipi-appstore/master/apps/${app}/config.json`,
    );
    const appConfig = await config.text();
    try {
      const appConfigJson = JSON.parse(appConfig);

      if (!appConfigJson.deprecated) {
        apps[app] = {
          id: appConfigJson.id,
          name: appConfigJson.name,
          description: appConfigJson.short_desc,
          source: appConfigJson.source,
          port: appConfigJson.port,
        };
      }
    } catch (e) {
      console.error(`Error parsing config for ${app}`);
    }
  }

  return { apps };
};

const appToReadme = async (app: App) => {
  return `| <img src="apps/${app.id}/metadata/logo.jpg" height="auto" width=50> | [${app.name}](${app.source}) | ${app.description} | ${app.port} |`;
};

const writeToReadme = (appsList: string) => {
  const baseReadme = fs.readFileSync(
    __dirname + "/../../templates/README.md",
    "utf8",
  );
  const finalReadme = baseReadme.replace("<!appsList>", appsList);
  fs.writeFileSync(__dirname + "/../../README.md", finalReadme);
};

const main = async () => {
  const apps = await getAppsList();
  const appKeys = Object.keys(apps["apps"]);
  let appsList = "";

  for (let i = 0; i < appKeys.length; i++) {
    const appFinal = await appToReadme(apps["apps"][appKeys[i]]);
    appsList = appsList + (appFinal + "\n");
  }

  writeToReadme(appsList);
  exec(
    `npx prettier ${__dirname + "/../../README.md"} --write`,
    (stdout, stderr) => {
      if (stderr) {
        console.error(stderr);
      } else if (stdout) {
        console.log(stdout);
      }
    },
  );
};

main();
