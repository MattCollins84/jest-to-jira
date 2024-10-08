import { access, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { Terminal } from "terminal-kit";
import Input from "../lib/Input";
import Config from "../lib/Config";

interface InitOpts {
  terminal: Terminal
}

interface InitResponse {
  config: Config
}
export default async ({ terminal }: InitOpts): Promise<InitResponse> => {

  // check if the ~/.jest-to-jira.cfg file exists or not
  const config = new Config();
  await config.load();

  if (config.isLoaded()) return { config }
  

  // if config does not exist, ask for input
  const input = new Input(terminal);
  terminal.yellow('No configuration found. Please enter your JIRA settings:').nextLine(2)
  const host = await input.text('JIRA Host (e.g. https://your-domain.atlassian.net)');
  const email = await input.text('Email Address');
  const apiToken = await input.text('API Token');
  const awsAccessKeyId = await input.text('AWS Access Key');
  const awsSecretAccessKey = await input.text('AWS Secret Key');
  
  // update config
  const newInput = { host, email, apiToken, awsAccessKeyId, awsSecretAccessKey };
  await config.update(newInput);

  return { config }



}