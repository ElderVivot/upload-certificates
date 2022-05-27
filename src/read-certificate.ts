import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import os from 'os'
import path from 'path'
import pem from 'pem'
import util from 'util'

interface ICertificateInfo extends pem.CertificateSubjectReadResult {
    validity: {
        start: number,
        end: number
    }
}

if (os.platform() === 'win32') {
    process.env.OPENSSL_CONF = path.join(__dirname, '..', '..', '..', 'vendor', 'openssl', 'shared', 'openssl.cnf')
    pem.config({
        pathOpenSSL: path.join(__dirname, '..', '..', '..', 'vendor', 'openssl', os.arch() === 'x64' ? 'x64' : 'ia32', 'openssl.exe')
    })
}

const readPkcs12Async = util.promisify(
    (bufferOrPath: string | Buffer, options: pem.Pkcs12ReadOptions, cb: pem.Callback<pem.Pkcs12ReadResult>) => pem.readPkcs12(
        bufferOrPath, options, (err, result) => cb(err, result)
    )
)
const readCertificateInfoAsyn = util.promisify(
    (certificate: string, cb: pem.Callback<ICertificateInfo>) => pem.readCertificateInfo(
        certificate, (err, result: ICertificateInfo) => cb(err, result)
    )
)

export async function ReadCertificate (pathCertificate: string, password: string) : Promise<ICertificateInfo> {
    try {
        const certificate = await readPkcs12Async(pathCertificate, { p12Password: password })
        const certificateInfo = await readCertificateInfoAsyn(certificate.cert)

        const nameFile = path.basename(pathCertificate)

        const formData = new FormData()
        formData.append('password', password)
        formData.append('file', fs.readFileSync(pathCertificate), { filename: nameFile })

        const res = await axios.post(`${process.env.API_HOST}/certificate`, formData, { headers: { tenant: process.env.TENANT } })
        console.log(res.data)

        return certificateInfo
    } catch (error) {
        return {
            country: '',
            state: '',
            locality: '',
            organization: '',
            organizationUnit: '',
            commonName: 'invalid_password',
            emailAddress: '',
            validity: {
                start: 0,
                end: 0
            }
        }
    }
}