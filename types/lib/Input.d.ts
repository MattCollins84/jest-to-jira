import { Terminal } from "terminal-kit";
import { SingleColumnMenuResponse } from "terminal-kit/Terminal";
export default class Input {
    private terminal;
    constructor(terminal: Terminal);
    text(question: string): Promise<string>;
    singleColumnMenu(question: string, items: string[]): Promise<SingleColumnMenuResponse>;
}
