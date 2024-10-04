import { Terminal } from "terminal-kit";
import Config from "../lib/Config";
interface InitOpts {
    terminal: Terminal;
}
interface InitResponse {
    config: Config;
}
declare const _default: ({ terminal }: InitOpts) => Promise<InitResponse>;
export default _default;
