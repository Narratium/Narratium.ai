import { createRequest } from "@/function/data/google-request";

const login_url = "https://accounts.google.com/o/oauth2/v2/auth";
const token_url = "https://oauth2.googleapis.com/token";
const refresh_token_url = "https://oauth2.googleapis.com/token";

// Use environment variables for sensitive credentials
const client_id = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || "";
const client_secret = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET || "";
const redirect_uri = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI || "https://www.narratium.org/oauth2callback";

export function getGoogleAjaxUrl(url: string, params: Record<string, string>) {
  const newUrl = new URL(url);
  for(const key in params) {
    newUrl.searchParams.append(key, params[key]);
  }
  return newUrl.toString();
}

export function getGoogleLoginUrl() {
  return getGoogleAjaxUrl(login_url, { client_id, redirect_uri, response_type: "code", scope: "https://www.googleapis.com/auth/drive", access_type: "offline", prompt: "consent" });
}

export function getGoogleToken(code: string) {
  const info = {
    code: code,
    client_id: client_id,
    client_secret: client_secret,
    redirect_uri: redirect_uri,
    grant_type: "authorization_code",
  };

  return fetch(token_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(info),
  }).then(res => res.json());
}

export function refreshGoogleToken() {
  const refresh_token = localStorage.getItem("google_drive_refresh_token") as string;
  const info = {
    client_id: client_id,
    client_secret: client_secret,
    refresh_token: refresh_token,
    grant_type: "refresh_token",
  };
  return fetch(refresh_token_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(info),
  }).then(res => res.json());
}

export async function getGoogleCodeByUrl(url: Location) {
  const { search } = url;
  if(search) {
    const info = (search.replace("?", "").split("&") || []).reduce((o: Record<string, string>, e:string) => {
      const [key, value] = e.split("=");
      if(key) o[key] = value;
      return o;
    }, {});
    if(info.code) {
      try {
        const res = await getGoogleToken(info.code);
        if(res?.access_token) {
          localStorage.setItem("google_drive_token", res.access_token);
          localStorage.setItem("google_drive_refresh_token", res.refresh_token);

          window.location.replace(window.location.origin);
          alert("Google 授权成功！请再次导出数据至谷歌！");
        } else {
          console.error("Get Google token Error");
        }
      } catch (error) {
        console.error("Get Google token Error:", error);
        alert("获取授权失败，请重试！");
      }
    }
  }
}

export async function backupToGoogle(info: { blob: Blob, filename: string, folderId: string }) {  
  const formData = new FormData();
  const metadata = {
    name: info.filename,
    parents: [info.folderId], // 关键：指定目标文件夹ID
  };
  const file = new File([info.blob], info.filename, { type: "application/json" });
  formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  formData.append("file", file);
  await createRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    body: formData,
  });
}

export async function getFolderList() {
  const url = getGoogleAjaxUrl("https://www.googleapis.com/drive/v3/files", {
    pageSize: "10",
    fields: "files(id, name, mimeType, createdTime)",
    q: "mimeType='application/vnd.google-apps.folder' and name = 'NarratiumBackup'",
  });
  const res = await createRequest<{ files: any[] }>(url, {});
  if(res.files.length) {
    const folder = res.files[0];
    return folder;
  } else {
    return await createDefaultFolder();
  }
}

async function createDefaultFolder() {
  return await createRequest("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name: "NarratiumBackup",
      mimeType: "application/vnd.google-apps.folder",
      parents: ["root"], // 关键：设置为root表示根目录
    }),
  });
}

export async function getBackUpFile(folderId:string) {
  const url = getGoogleAjaxUrl("https://www.googleapis.com/drive/v3/files", {
    q: `'${folderId}' in parents`,  // 核心：按父文件夹ID筛选
    fields: "files(id, name, mimeType, modifiedTime, size, webViewLink)",
    pageSize: "10", // 最大允许值
    orderBy: "createdTime desc",
  });
  const res = await createRequest<{ files: any[] }>(url, {});
  if(res?.files?.[0]) {
    const blob = await fetch(`https://www.googleapis.com/drive/v3/files/${res.files[0].id}?alt=media`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("google_drive_token"),
      },
    }).then(res => res.blob());
    const file = new File([blob], "backup.json", { type: "application/json" });
    return file;
  } else {
    alert("没有备份文件，请先导出数据！");
    return false;
  }
}
