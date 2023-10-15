import axios from 'axios'
import { promises as fs } from 'fs'
import fsExtra from 'fs-extra'
import path from 'path'

import { listFiles } from './get-list-files-of-folder'
import { logger } from './logger'
import { ReadCertificate } from './read-certificate'

const minimalizeSpaces = (text: string): string => {
    let newText = text
    while (newText.indexOf('  ') >= 0) newText = newText.replace('  ', ' ')
    newText = newText.trim()
    return newText
}

const getPasswordOfNameFile = (file: string, passwordDefault: string): string => {
    try {
        const extensionFile = path.extname(file)
        const fileMinimalizeSpaces = minimalizeSpaces(file)
        const fileUpperCase = fileMinimalizeSpaces.toUpperCase()
        const positionPassword = fileUpperCase.indexOf(passwordDefault)
        const textWithPassword = fileMinimalizeSpaces.substring(positionPassword + passwordDefault.length, file.length).trim()
        const textWithPasswordSplit = textWithPassword.split(' ')
        const password = textWithPasswordSplit[0].replace(extensionFile, '')
        return password
    } catch (error) {
        logger.error({
            msg: 'Error to get password of name file',
            locationFile: __filename,
            error
        })
        return ''
    }
}

const identifiesPasswordDefault = (file: string): string => {
    let password = ''
    const fileUpperCase = minimalizeSpaces(file.toUpperCase())
    const passwordDefaults = ['SENHA=', 'SENHA-', 'SENHA -', 'SENHA =', 'SENHA']
    for (const passwordDefault of passwordDefaults) {
        const positionPasswordDefault = fileUpperCase.indexOf(passwordDefault)
        if (positionPasswordDefault >= 0) {
            password = getPasswordOfNameFile(file, passwordDefault)
            break
        }
    }
    return password
}

export async function OrganizeCertificates (directory: string, directoryToCopy: string): Promise<void> {
    try {
        await fs.rmdir(directoryToCopy, { recursive: true })
        logger.info('- Directory with certificates deleted.')
    } catch (error) {
        logger.error({
            msg: '- Error delete directory with certificate.',
            locationFile: __filename,
            error
        })
    }
    fsExtra.mkdirSync(directoryToCopy)

    const { data: listCertificateAlreadyExistSaved } = await axios.get(`${process.env.API_HOST}/certificate/list_certificate_not_overdue`, { headers: { tenant: process.env.TENANT } })

    const files = await listFiles(directory)
    for (const file of files) {
        const extensionFile = path.extname(file)
        if (extensionFile !== '.pfx' && extensionFile !== '.p12') continue
        const nameFileOriginal = path.basename(file)
        const fileUpperCase = file.toUpperCase()
        if (fileUpperCase.indexOf('SENHA') >= 0) {
            let identifiedPasswordPattern = false
            const password = identifiesPasswordDefault(file)
            if (password) {
                identifiedPasswordPattern = true
                const certificateInfo = await ReadCertificate(file, password, listCertificateAlreadyExistSaved)
                if (certificateInfo.commonName === 'invalid_password') {
                    await fsExtra.copy(file, path.resolve(directoryToCopy, 'senha_invalida', `${nameFileOriginal}`), { overwrite: true })
                    continue
                }
                if (new Date() > new Date(certificateInfo.validity.end)) {
                    await fsExtra.copy(file, path.resolve(directoryToCopy, 'vencido', `${nameFileOriginal}`), { overwrite: true })
                    continue
                }
            }
            if (!identifiedPasswordPattern) {
                await fsExtra.copy(file, path.resolve(directoryToCopy, 'padrao_senha_nao_reconhecido', `${nameFileOriginal}`), { overwrite: true })
            }
        } else {
            await fsExtra.copy(file, path.resolve(directoryToCopy, 'sem_senha', `${nameFileOriginal}`), { overwrite: true })
        }
    }
}