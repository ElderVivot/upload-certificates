import 'dotenv/config'
import { CronJob } from 'cron'
import express from 'express'

import { logger } from './logger'
import { OrganizeCertificates } from './organize-certificates'

class Applicattion {
    async process (): Promise<void> {
        logger.info('- Organizando certificados')
        await OrganizeCertificates(process.env.FOLDER_CERTIFICATE_ORIGINAL, process.env.FOLDER_CERTIFICATE_COPY)
    }
}

export const job = new CronJob(
    '0 */3 * * *',
    async function () {
        try {
            const applicattion = new Applicattion()
            await applicattion.process()
        } catch (error) {
            logger.error(`- Erro ao processar baixa de notas ${error}`)
        }
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