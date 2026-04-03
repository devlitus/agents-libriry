import { VERSION } from '@devagents/core'

const args = process.argv.slice(2)
const command = args[0]

if (command === 'setup') {
  console.log("devagents setup - not implemented yet")
} else if (command === 'check') {
  console.log("devagents check - not implemented yet")
} else {
  console.log(`devagents CLI v${VERSION}`)
  console.log("Usage: devagents [setup|check]")
}
