import { refreshGoogleToken } from "./google-control"


export async function createRequest<T = any>(url: string, info: Partial<RequestInit & { headers?: Record<string, string> }>):Promise<T> {
    if(!info?.headers) {
        info.headers = {}
    }
    if(!info.headers?.['Authorization']) {
        info.headers['Authorization'] = 'Bearer ' + localStorage.getItem('google_drive_token')
    }
    return fetch(url, info).then(async res => {
        if(res.status === 401) {
            console.log('令牌过期！')
            const data = await refreshGoogleToken()
            console.log('data====>', data)
            localStorage.setItem('google_drive_token', data.access_token);
            // return createRequest(url, info)
        }
        return res.json()
    })
}