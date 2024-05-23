import 'dotenv/config'
import { CronJob } from 'cron'
import express from 'express'

import { logger } from './logger'
import { OrganizeCertificates } from './organize-certificates'

class Applicattion {
    async process (): Promise<void> {
        try {
            logger.info('- Organizando certificados')
            await OrganizeCertificates(process.env.FOLDER_CERTIFICATE_ORIGINAL, process.env.FOLDER_CERTIFICATE_COPY)
        } catch (error) {
            logger.error(error)
        }
    }
}

//
new Applicattion().process().then(_ => console.log(_))

export const job = new CronJob(
    '05 */8 * * *',
    async function () {
        const applicattion = new Applicattion()
        await applicattion.process()
    },
    null,
    true
)
job.start()

const app = express()

// const applicattion = new Applicattion()
// applicattion.process().then(_ => console.log(_))

const port = Number(process.env.SERVER_PORT) || 3341
app.listen(port, () => console.log(`Executing Server Schedule in port ${port} !`))