import Config from "./Config";
export default class S3 {
    private config;
    private client;
    private region;
    private bucketName;
    private tmp;
    constructor(config: Config);
    verify(): Promise<void>;
    downloadObject(filename: string): Promise<string>;
}
