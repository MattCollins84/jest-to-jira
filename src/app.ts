import init from "./init/init";
import { terminal } from "terminal-kit";
import JIRA, { JIRATicket } from "./lib/JIRA";
import Input from "./lib/Input";
import { readFile } from "fs/promises";
import { S3Client } from "@aws-sdk/client-s3";
import S3 from "./lib/S3";

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

  // Init JIRA, Input and S3
  const jira = new JIRA(config)
  const input = new Input(terminal)
  const s3 = new S3(config)
  try {
    await s3.verify()
  } catch (err) {
    terminal.red('Error connecting to S3').nextLine(1)
    if (err instanceof Error) {
      terminal.red(err.message).nextLine(1)
    }
    process.exit(1)
  }

  // select the S3 report
  const reportPath = await input.text('Paste the URL to the S3 report');
  
  // if reportPath does not contain 'automated-testing-results.s3.amazonaws.com', exit, because this does not look like a valid URL
  if (!reportPath.includes('automated-testing-results.s3.amazonaws.com')) {
    terminal.red('Invalid S3 Report URL').nextLine(1)
    process.exit(1)
  }

  // download the report
  const reportNameParts = reportPath.split('/').toReversed().shift().split('?')[0].replace('.html', '').split('_')
  reportNameParts.splice(3, 1)
  const jsonReportName = reportNameParts.join('_') + '.json'
  terminal.yellow(`Downloading and processing report: ${jsonReportName}...`)
  const filePath = await s3.downloadObject(jsonReportName)
  
  // parse test data
  const testData: TestReport = JSON.parse(await readFile(filePath, 'utf-8'))
  const failedSuites = testData.testResults
                          // filter out suites that passed
                          .filter((result: any) => result.status === 'failed')
                          // map failed suits to only include first failed assertion
                          .map((result: any) => {
                            const firstFailedAssertion = result.assertionResults.find((assertion: any) => assertion.status === 'failed')
                            result.failure = firstFailedAssertion
                            return result
                          })
  
  terminal.green(`Done! ${failedSuites.length} failures found`).nextLine(1)
  terminal.yellow(`Report can be found at: ${filePath}...`).nextLine(1)
  
  // if there are no failed tests, exit
  if (failedSuites.length === 0) {
    terminal.green('No failed tests found').nextLine(1)
    process.exit(0)
  }
  
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

  // create tickets for failed tests
  for (const suite of failedSuites) {

    // get data for ticket
    const nameParts = suite.name.split('/')
    nameParts.reverse()
    const testName = nameParts[0]
    const epicName = nameParts[3].toUpperCase()
    const selectedEpic = epics.find(epic => epic.name === epicName) || null
    const errorMessage = suite.failure.failureMessages.length > 0 ? suite.failure.failureMessages[0] : 'No error message provided'
    const ticketData: JIRATicket = { 
      test: testName, 
      epic: selectedEpic,
      fixVersion: selectedFixVersion.id,
      errors: [errorMessage]
    }

    // check for any duplicates
    const duplicates = await jira.checkForDuplicateTicket(selectedProject.id, selectedSprint.id, ticketData)
    if (duplicates.length > 0) {
      terminal.red(`Duplicate ticket${duplicates.length > 1 ? 's' : ''} found for this test: ${testName}`).nextLine(1)
      for (const dupe of duplicates) {
        terminal.red(`Ticket: ${config.get().host}/browse/${dupe.key}`).nextLine(1)
      }
    }

    // confirm we want to create a ticket for this test
    const confirm = await input.singleColumnMenu(`Create ticket for test: ${testName}`, ['Yes', 'No'])
    if (confirm.selectedIndex === 1) {
      continue
    }
    
    const ticket = await jira.createTicket(selectedProject.id, selectedSprint.id, ticketData)
    terminal.green(`Created ticket ${ticket.key}: ${ticket.url}`).nextLine(1)

  }
  
  process.exit(0)

}

main()