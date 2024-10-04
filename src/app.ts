import init from "./init/init";
import { terminal } from "terminal-kit";
import JIRA, { JIRATicket } from "./lib/JIRA";
import Input from "./lib/Input";
import { readFile } from "fs/promises";

interface TestReport {
  testResults: {
    status: string
    name: string
    message: string
  }[]
}
const main = async () => {

  terminal.grabInput(false, false) ;

  terminal.on('key', (name: string) => {
    if (name === 'CTRL_C') { 
      terminal.nextLine(1).red('EXITING AFTER CTRL+C').nextLine(1)
      process.exit();
    }
  });

  terminal.clear()
  terminal.green('Welcome to Jest-to-JIRA').nextLine(2)
  terminal.yellow('Checking for existing configuration...').nextLine(1)

  // Create a config file and update settings
  const { config } = await init({ terminal })

  terminal.yellow(`Configuration loaded for: ${config.get().host}`).nextLine(2)

  // Connect to JIRA
  const jira = new JIRA(config)
  
  const input = new Input(terminal)

  // select projects
  const projects = await jira.getProjects()
  const projectNames = projects.map(project => project.name)
  const projectResponse = await input.singleColumnMenu('Choose your project', projectNames)
  const selectedProject = projects[projectResponse.selectedIndex]
  terminal.clear()

  // select boards
  const boards = await jira.getBoards(selectedProject.id)
  const boardNames = boards.map(board => board.name)
  const boardResponse = await input.singleColumnMenu('Choose your board', boardNames)
  const selectedBoard = boards[boardResponse.selectedIndex]
  terminal.clear()

  // select sprints
  const sprints = await jira.getSprints(selectedBoard.id)
  const sprintNames = sprints.map(sprint => sprint.name)
  const sprintResponse = await input.singleColumnMenu('Choose your sprint', sprintNames)
  const selectedSprint = sprints[sprintResponse.selectedIndex]
  terminal.clear()

  // get fix versions
  const fixVersions = await jira.getFixVersions(selectedProject.id)
  const fixVersionNames = fixVersions.map(version => version.name)
  const fixVersionResponse = await input.singleColumnMenu('Choose your fix version', fixVersionNames)
  const selectedFixVersion = fixVersions[fixVersionResponse.selectedIndex]
  terminal.clear()

  // get epics
  const epics = await jira.getEpics(selectedProject.id)

  // get test data
  const testData: TestReport = JSON.parse(await readFile('./testdata/report.json', 'utf-8'))
  const failedSuites = testData.testResults.filter((result: any) => result.status === 'failed')

  const confirmCreate = await input.singleColumnMenu(`Create ${failedSuites.length} tickets for failed tests?`, ['Yes', 'No'])
  if (confirmCreate.selectedIndex === 1) {
    terminal.red('EXITING').nextLine(1)
    process.exit(0)
  }

  // create tickets
  terminal.yellow('Creating tickets...').nextLine(1)
  terminal.yellow(`Project: ${selectedProject.name}`).nextLine(1)
  terminal.yellow(`Board: ${selectedBoard.name}`).nextLine(1)
  terminal.yellow(`Sprint: ${selectedSprint.name}`).nextLine(2)
  terminal.yellow(`Fix Version: ${selectedFixVersion.name}`).nextLine(2)

  for (const suite of failedSuites) {
    const nameParts = suite.name.split('/')
    nameParts.reverse()
    const testName = nameParts[0]
    const epicName = nameParts[3].toUpperCase()
    const selectedEpic = epics.find(epic => epic.name === epicName) || null

    const ticketData: JIRATicket = { 
      test: testName, 
      epic: selectedEpic,
      fixVersion: selectedFixVersion.id,
      errors: [suite.message]
    }
    const ticket = await jira.createTicket(selectedProject.id, selectedSprint.id, ticketData)
    console.log(ticket)

  }
  
  process.exit(0)

}

main()