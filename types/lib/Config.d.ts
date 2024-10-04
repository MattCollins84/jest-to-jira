interface ConfigFile {
    host: string;
    email: string;
    apiToken: string;
}
export default class Config {
    private static CONFIG_PATH;
    private config;
    private configLoaded;
    constructor();
    private configFileExists;
    load(): Promise<void>;
    reload(): Promise<void>;
    isLoaded(): boolean;
    update(config: Partial<ConfigFile>): Promise<void>;
    get(): ConfigFile;
}
export {};
