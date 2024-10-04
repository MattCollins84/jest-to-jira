import { Terminal } from "terminal-kit";
import { SingleColumnMenuResponse } from "terminal-kit/Terminal";

export default class Input {

  constructor(private terminal: Terminal) {

  }

  async text(question: string): Promise<string> {
    this.terminal.green(`${question}: `)
    const input = await this.terminal.inputField().promise as string
    this.terminal.nextLine(1)
    return input
  }

  async singleColumnMenu(question: string, items: string[]): Promise<SingleColumnMenuResponse> {
    this.terminal.green(`${question}: `)
    const response = await this.terminal.singleColumnMenu(items).promise
    this.terminal.nextLine(1)
    return response
  }

}