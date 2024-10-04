import Config from "./Config";
interface JIRAProject {
    id: string;
    key: string;
    name: string;
}
interface JIRABoard {
    id: number;
    name: string;
    projectId: number;
}
interface JIRASprint {
    id: number;
    name: string;
    state: string;
}
interface JIRAFixVersion {
    name: string;
    id: string;
}
interface JIRAEpic {
    name: string;
    id: string;
}
export interface JIRATicket {
    test: string;
    epic: JIRAEpic;
    fixVersion: string;
    errors: string[];
}
export default class JIRA {
    private config;
    private v3;
    private v1;
    constructor(config: Config);
    getProjects(): Promise<JIRAProject[]>;
    getBoards(projectId: string): Promise<JIRABoard[]>;
    getSprints(boardId: number): Promise<JIRASprint[]>;
    getFixVersions(projectId: string): Promise<JIRAFixVersion[]>;
    getEpics(projectId: string): Promise<JIRAEpic[]>;
    generateErrorCodeblocks(errors: string[]): {
        type: string;
        attrs: {
            language: string;
        };
        content: {
            text: string;
            type: string;
        }[];
    }[];
    createTicket(projectId: string, sprintId: number, ticket: JIRATicket): Promise<import("jira.js/out/version3/models").CreatedIssue>;
}
export {};
