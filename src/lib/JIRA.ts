import Config from "./Config";
import { Version3Client, AgileClient } from "jira.js";

interface JIRAProject {
  id: string
  key: string
  name: string
}
interface JIRABoard {
  id: number
  name: string
  projectId: number
}
interface JIRASprint {
  id: number
  name: string
  state: string
}
interface JIRAFixVersion {
  name: string
  id: string
}
interface JIRAEpic {
  name: string
  id: string
}
export interface JIRATicket {
  test: string
  epic: JIRAEpic
  fixVersion: string
  errors: string[]
}
export default class JIRA {

  private v3: Version3Client;
  private v1: AgileClient;

  constructor(private config: Config) {
    // connect to JIRA
    const connectOps = {
      host: 'https://datum360.atlassian.net',
      authentication: {
        basic: {
          email: 'matt.collins@datum360.com',
          apiToken: process.env.JIRA_API_TOKEN as string,
        },
      },
    }
    this.v3 = new Version3Client(connectOps);
    this.v1 = new AgileClient(connectOps);
  }

  async getProjects() {
    const res = await this.v3.projects.searchProjects()
    const projects: JIRAProject[] = res.values.map(project => ({ id: project.id, key: project.key, name: project.name }))
    return projects
  }

  async getBoards(projectId: string) {
    const res = await this.v1.board.getAllBoards({ projectKeyOrId: projectId })
    const boards: JIRABoard[] = res.values.map(board => ({ id: board.id, name: board.name, projectId: board.location.projectId }))
    return boards
  }

  async getSprints(boardId: number) {
    const sprintRes = await this.v1.board.getAllSprints({ boardId: boardId, state: 'future,active' })
    const sprints: JIRASprint[] = sprintRes.values.map(sprint => ({ id: sprint.id, name: sprint.name, state: sprint.state }))
                                  //sort sprints by name alphabetically
                                  .sort((a, b) => a.name.localeCompare(b.name))
    return sprints
  }

  async getFixVersions(projectId: string) {
    const res = await this.v3.projectVersions.getProjectVersions({
      projectIdOrKey: projectId
    })
    const fixVersions: JIRAFixVersion[] = res.map(version => ({ name: version.name, id: version.id }))
                                      // filter out fix versions 4.6 and above
                                      .filter(version => {
                                        const [major, minor] = version.name.split('.').map(Number)
                                        return major >= 4 && minor >= 6
                                      })
                                      //sort versions by name alphabetically
                                      .sort((a, b) => a.name.localeCompare(b.name))
    return fixVersions
  }

  async getEpics(projectId: string) {
    const res = await this.v3.issueSearch.searchForIssuesUsingJql({
      jql: `project = ${projectId} AND type = Epic`,
      fields: ['summary', 'id']
    })
    const epics: JIRAEpic[] = res.issues.map(issue => ({ name: issue.fields.summary, id: issue.id }))
    return epics
  }

  generateErrorCodeblocks(errors: string[]) {
    return errors.map(error => {
      return {
        "type": "codeBlock",
        "attrs": {
          "language": "javascript"
        },
        "content": [
          {
            "text": error,
            "type": "text"
          }
        ]
      }
    })
  }

  async createTicket(projectId: string, sprintId: number, ticket: JIRATicket) {
    const res = await this.v3.issues.createIssue({
      fields: {
        project: { id: projectId },
        summary: `automated test failure: ${ticket.test}`,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'BACKGROUND',
                  marks: [{ type: 'strong' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `An automated test has failed - `
                },
                {
                  type: 'text',
                  text: ticket.test,
                  marks: [{ type: 'code' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticket.errors.length === 1 ? `This is the error:` : `These are the errors:`
                }
              ]
            },
            ...this.generateErrorCodeblocks(ticket.errors),
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'TASK',
                  marks: [{ type: 'strong' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Fix the issue and update the ticket with the resolution.'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'If this test was previously passing, then the issue may be related to a recent change in the codebase. Please avoid changing the tset to match the current behaviour unless absolutely necessary.'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'ACCEPTANCE CRITERIA',
                  marks: [{ type: 'strong' }]
                }
              ]
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Smoke tests pass locally'
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'The test passes locally'
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'The test passes overnight on the server'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        issuetype: { id: '10010' },
        parent: { id: ticket.epic.id },
        customfield_10020: sprintId,
        fixVersions: [{ id: '10034' }],
        // security review required
        customfield_10047: { value: 'No' }
      }
    })
    return res
  }

}