import { access, readFile, writeFile } from "fs/promises";
import { homedir } from "os";

interface ConfigFile {
  host: string
  email: string
  apiToken: string
}

export default class Config {

  private static CONFIG_PATH = `${homedir()}/.jest-to-jira.cfg`;
  private config: ConfigFile;
  private configLoaded: boolean = false

  constructor() {
    
  }

  private async configFileExists() {
    try {
      await access(Config.CONFIG_PATH);
      return true;
    } catch {
      return false;
    }
  }

  async load() {
    const configExists = await this.configFileExists();
    if (configExists) {
      try {
        this.config = JSON.parse(await readFile(Config.CONFIG_PATH, 'utf-8')) as ConfigFile;
        this.configLoaded = true;
      } catch (error) {
        this.configLoaded = false;
        this.config = null
        console.error('Error reading config file: ', Config.CONFIG_PATH);
        throw error;
      }
    }
  }

  async reload() {
    await this.load();
  }

  isLoaded(): boolean {
    return this.configLoaded;
  }

  async update(config: Partial<ConfigFile>) {
    const newConfig = { ...this.config, ...config };
    await writeFile(Config.CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    await this.load()
  }

  get(): ConfigFile {
    return this.config;
  }

}