import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import Config from "./Config";
import { createWriteStream } from "fs";
import { resolve } from "path";
import { pipeline, Readable } from "stream";
import { promisify } from "util";

const pipelinePromise = promisify(pipeline);

export default class S3 {

  private client: S3Client;
  private region: string = 'eu-west-1'
  private bucketName: string = 'automated-testing-results'
  private tmp: string = '/datum360/lvm/tmp'

  constructor(private config: Config) {
    // connect to S3
    const credentials = {
      accessKeyId: config.get().awsAccessKeyId,
      secretAccessKey: config.get().awsSecretAccessKey,
    }
    this.client = new S3Client({ region: this.region, credentials});
  }

  async verify() {
    await this.client.send(new ListObjectsV2Command({ Bucket: this.bucketName, MaxKeys: 1 }))
  }

  async downloadObject(filename: string) {
    
    // request the object
    const fullKey = `ci-testing/${filename}`
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: fullKey }))
    
    // stream down to a local file
    const localPath = resolve(this.tmp, filename)
    const ws = createWriteStream(localPath)
    await pipelinePromise(response.Body as Readable, ws)

    return localPath
  }

}