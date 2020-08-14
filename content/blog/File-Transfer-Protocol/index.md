---
title: "文件传输协议（FTP）的设计和实现"
date: "2014-03-19T13:15:30Z"
description: "了解FTP的具体实现细节。设计和实现一个简单的文件传输协议。"
tags: 
  - "C/C++"
  - "TCP/IP"
---

80年代初，美国政府的高级研究工程机构（ ARPA）给加利福尼亚大学Berkeley分校提供了资金，让他们在UNIX操作系统下实现TCP/IP协议。在这个项目中，研究人员为TCP/IP网络通信开发了一个API（应用程序接口）。这个API称为Socket接口（套接字），也叫BSD Socket 。 BSD Socket接口是TCP/IP网络中最为通用的API，也是在互联网上进行应用开发时最为通用的API。

Socket是应用层与TCP/IP协议栈通信的中间软件抽象层，它是一组接口，把复杂的TCP/IP协议栈隐藏在Socket接口后面。对普通用户来说，一组简单的接口就是全部，让Socket去组织数据，以符合指定的协议。
Socket套接字有四种类型： SOCK_STREAM（字节流套接字）、 SOCK_DGRAM（数据报套接字）、SOCK_SEQPACKET（有序分组套接字）和SOCK_RAW（原始套接字）。
字节流套接字使用了TCP协议，提供面向连接的，具有顺序控制、拥塞控制和可靠传输功能的双向通信服务。
数据报套接字使用了UDP协议，为数据流提供无连接的双向通信，不支持顺序控制、拥塞控制和可靠传输。如果基于数据报套接字的应用程序要求可靠传输的话，需要自己实现确认重传机制。

#### 要求
用Socket编程接口编写两个程序，分别为客户端程序（ client ） 和服务器端程序（ server）， 服务器端程序在后台进行时，运行客户端程序，应能够实现以下功能：
1. 获取远方的一个文件；
2. 传送给远方一个文件；
3. 显示远方的当前目录；
4. 列出远方当前目录下的内容；
5. 改变远方的当前目录；
6. 显示可以提供的命令，即Help；
7. 退出返回。


`server.cpp`
```cpp
#include <errno.h>
#include <iostream>
#include <string>
#include <stdlib.h>
#include <stdio.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <stdint.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <signal.h>
#include <ctime>
#include <fcntl.h>


using namespace std;


int open_listenfd(int port);
void ftp_server(int connectfd);
void wait_child_process(int sig);

string rootDir = "./ftp";
string nowDir = "/";

string connect_ip;

sockaddr_in clientaddr;
socklen_t clientlen = sizeof(clientaddr);

int main(int argc, char* argv[])
{
    int port = 21;

    if(argc == 2)
        port = atoi(argv[1]);

    signal(SIGCHLD, wait_child_process);
    srand((unsigned) time(0));

    int listenfd;
    if((listenfd = open_listenfd(port)) < 0)  {
        cout << "port: " << port << " failed" <<endl;
        return 0;
    }

    while(true)  {
        int connectfd = accept(listenfd, (sockaddr*) &clientaddr, &clientlen);

        connect_ip = inet_ntoa(clientaddr.sin_addr);
        cout << "connect ip : " << connect_ip << endl;

        if(fork() == 0)  {
            ftp_server(connectfd);
            return 0;
        }

        close(connectfd);
    }

    close(listenfd);

    return 0;
}

void wait_child_process(int sig)
{
    while(waitpid(-1, NULL, WNOHANG) > 0);
}

int open_listenfd(int port)
{
    int listenfd;
    sockaddr_in addr;


    if((listenfd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
        return -1;

    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons((unsigned short) port);


    if(bind(listenfd, (sockaddr*) &addr, sizeof(addr)) < 0)
        return -1;


    if(listen(listenfd, 1) < 0 )
        return -1;

    return listenfd;
}


int command_PORT(string content);
int command_PASV(int connectfd);
void command_pwd(int connectfd);
void command_dir(int connectfd, int datafd);
void command_cd(int connectfd, string content);
void command_get(int connectfd, int datafd, string filename);
void command_put(int connectfd, int datafd, string filename);

void ftp_server(int connectfd)
{
    const int BUFSIZE = 300;
    char buf[BUFSIZE];

    read(connectfd, &buf, BUFSIZE);

    string request = buf;

    string command;
    int pos = request.find(' ');
    pos = pos < 0 ? request.length() : pos;
    command = request.substr(0, pos);

    if(command == "open")  {
        char response[] = "logged on";
        write(connectfd, response, sizeof(response));
    } else {
        char response[] = "failed";
        write(connectfd, response, sizeof(response));
        return;
    }

    int datafd = -1;

    string content;

    while(true)  {
        if(read(connectfd, &buf, BUFSIZE) <= 0)
            break;
        request = buf;

        cout << connect_ip << " : " << request << endl;

        pos = request.find(' ');
        pos = pos < 0 ? request.length() : pos;
        command = request.substr(0, pos);

        pos = pos == request.length() ? pos : pos + 1;
        content = request.substr(pos);


        if(command == "PORT")
            datafd = command_PORT(content);
        else if(command == "PASV")
            datafd = command_PASV(connectfd);
        else if(command == "pwd")
            command_pwd(connectfd);
        else if(command == "dir")
            command_dir(connectfd, datafd);
        else if(command == "cd")
            command_cd(connectfd, content);
        else if(command == "get")
            command_get(connectfd, datafd, content);
        else if(command == "put")
            command_put(connectfd, datafd, content);
        else if(command == "quit")
            break;
    }

    close(connectfd);
}

void close_datafd(int datafd);

const int BUFSIZE = 1400;

void command_put(int connectfd, int datafd, string filename)
{
    int filefd = open((rootDir + nowDir + filename).c_str(), O_WRONLY | O_CREAT);

    int count = 0;
    char buf[BUFSIZE];
    while((count = read(datafd, buf, sizeof(buf))) > 0)
        write(filefd, buf, count);

    close(filefd);
    close_datafd(datafd);
}

void command_get(int connectfd, int datafd, string filename)
{
    int filefd = open((rootDir + nowDir + filename).c_str(), O_RDONLY);

    int count = 0;
    char buf[BUFSIZE];
    while((count = read(filefd, buf, sizeof(buf))) > 0)
        write(datafd, buf, count);

    close(filefd);
    close_datafd(datafd);
}

void command_cd(int connectfd, string content)
{
    if(content.substr(0,1) == "/")
        nowDir = content;
    else
        nowDir = nowDir + content + "/";
    cout << "cd " << content << endl;
}

void command_dir(int connectfd, int datafd)
{
    char buf[BUFSIZE];
    FILE* ls = popen(("ls -l " + rootDir + nowDir).c_str(), "r");

    int read_count = fread(buf, sizeof(char), sizeof(buf), ls);
    buf[read_count] = '\0';
    write(datafd, buf, read_count + 1);

    pclose(ls);
    close_datafd(datafd);
}

void command_pwd(int connectfd)
{
    write(connectfd, nowDir.c_str(), nowDir.length() + 1);
}


bool is_PORT_PASV = true;
int PASV_listenfd = -1;

void close_datafd(int datafd)
{
    close(datafd);
    if(!is_PORT_PASV)
        close(PASV_listenfd);
}

int command_PORT(string content)
{
    is_PORT_PASV = true;

    int datafd;
    if((datafd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
        return -1;

    int optval = 1;
    if(setsockopt(datafd, SOL_SOCKET, SO_REUSEADDR, (const void*) &optval, sizeof(optval)) < 0)
        return -1;

    sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(20);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    if(bind(datafd, (sockaddr*) &addr, sizeof(addr)) < 0)
        return -1;

    sockaddr_in sin;
    sin.sin_family = AF_INET;
    sin.sin_port = htons(atoi(content.c_str()));
    sin.sin_addr = clientaddr.sin_addr;


    while(connect(datafd, (sockaddr*) &sin, sizeof(sin)) < 0);

    return datafd;
}

int command_PASV(int connectfd)
{
    is_PORT_PASV = false;

    int datafd;
    int port = 1024 + rand() % 3900;
    while((PASV_listenfd = open_listenfd(port)) < 0)  {
        cout << "PASV bind port failed : " << port << endl;
        port = 1024 + rand() % 3900;
    }

    char buf[20];
    sprintf(buf, "%d", port);
    string port_str = buf;
    cout << "PASV port : " << port_str << endl;
    write(connectfd, port_str.c_str(), port_str.length() + 1);

    sockaddr_in addr;
    addr.sin_family = AF_INET;
    socklen_t addrlen = sizeof(addr);
    datafd = accept(PASV_listenfd, (sockaddr*) &addr, &addrlen);


    return datafd;
}
```


`client.cpp` 
```cpp
#include <iostream>
#include <string>
#include <stdlib.h>
#include <stdio.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <stdint.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <signal.h>
#include <ctime>
#include <fcntl.h>


using namespace std;

int open_connectfd(char* ip_addr, int port);

int command_PORT(int connectfd);
int command_PASV(int connectfd);
void command_pwd(int connectfd);
void command_quit(int connectfd);
void command_dir(int connectfd);
void command_cd(int connectfd);
void command_get(int connectfd);
void command_put(int connectfd);
void command_help();

bool is_PORT_PASV = true;    // true : PORT, false : PASV
sockaddr_in sin;

int main(int argc, char* argv[])
{
    char* ip_addr = (char*) "127.0.0.1";
    int port = 21;

    if(argc == 3)  {
        ip_addr = argv[1];
        port = atoi(argv[2]);
    } else if (argc == 2)
        ip_addr = argv[1];

    int connectfd = open_connectfd(ip_addr, port);
    if(connectfd < 0)  {
        cout << "connect failed" << endl;
        return 0;
    }


    cout << "connect sucessed" << endl;

    const int BUFSIZE = 300;
    char buf[BUFSIZE];

    char open_str[] = "open";
    write(connectfd, open_str, sizeof(open_str));
    read(connectfd, buf, sizeof(buf));
    cout << buf << endl;

    string response;
    if((response = buf) != "logged on")  {
        cout << "connect ftp server failed" << endl;
        return 0;
    }

    srand((unsigned)time(0));
    string command;

    while(true)
    {
        cout << ">> ";
        cin >> command;

        if(command == "PORT")
            is_PORT_PASV = true;
        else if(command == "PASV")
            is_PORT_PASV = false;
        else if(command == "pwd")
            command_pwd(connectfd);
        else if(command == "dir")
            command_dir(connectfd);
        else if(command == "cd")
            command_cd(connectfd);
        else if(command == "?")
            command_help();
        else if(command == "get")
            command_get(connectfd);
        else if(command == "put")
            command_put(connectfd);
        else if(command == "quit")  {
            command_quit(connectfd);
            break;
        }
    }

    close(connectfd);

    return 0;
}

int PORT_listenfd = -1;

inline int open_datafd(int connectfd)
{
    return is_PORT_PASV ? command_PORT(connectfd) : command_PASV(connectfd);
}

void close_datafd(int datafd)
{
    close(datafd);
    if(is_PORT_PASV)
        close(PORT_listenfd);
}

int open_connectfd(char* ip_addr, int port)
{
    int connectfd;

    if((connectfd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
        return -1;

    sin.sin_family = AF_INET;
    sin.sin_port = htons(port);
    inet_pton(AF_INET, ip_addr, &sin.sin_addr);

    if(connect(connectfd, (sockaddr*) &sin, sizeof(sin)) < 0)
        return -1;

    return connectfd;
}

int open_listenfd(int port);


const int BUFSIZE = 1400;

void command_put(int connectfd)
{
    int datafd = open_datafd(connectfd);

    string filename;
    cin >> filename;

    string put_str = "put " + filename;
    write(connectfd, put_str.c_str(), put_str.length() + 1);

    int filefd = open(filename.c_str(), O_RDONLY);

    int count = 0;
    char buf[BUFSIZE];
    while((count = read(filefd, buf, sizeof(buf))) > 0)
        write(datafd, buf, count);

    close(filefd);
    close_datafd(datafd);
}

void command_get(int connectfd)
{
    int datafd = open_datafd(connectfd);

    string filename;
    cin >> filename;

    string get_str = "get " + filename;
    write(connectfd, get_str.c_str(), get_str.length() + 1);

    int filefd = open(filename.c_str(), O_WRONLY | O_CREAT);

    int count = 0;
    char buf[BUFSIZE];
    while((count = read(datafd, buf, sizeof(buf))) > 0)
        write(filefd, buf, count);


    close(filefd);
    close_datafd(datafd);
}

void command_cd(int connectfd)
{
    string path;
    cin >> path;
    path = "cd " + path;
    write(connectfd, path.c_str(), path.length() + 1);
}

void command_dir(int connectfd)
{
    int datafd = open_datafd(connectfd);

    char dir_str[] = "dir";
    write(connectfd, dir_str, sizeof(dir_str));

    char buf[1400];
    read(datafd, buf, sizeof(buf));

    cout << buf << endl;

    close_datafd(datafd);
}

void command_quit(int connectfd)
{
    char quit_str[] = "quit";
    write(connectfd, quit_str, sizeof(quit_str));
}

void command_pwd(int connectfd)
{
    char pwd_str[] = "pwd";
    write(connectfd, pwd_str, sizeof(pwd_str));

    char buf[40];
    read(connectfd, buf, sizeof(buf));
    cout << buf << endl;
}

void command_help()
{
    cout << "command : \n"
         << "get [filename]\n"
         << "put [filename]\n"
         << "pwd\n"
         << "dir\n"
         << "cd\n"
         << "quit\n";
}

int command_PORT(int connectfd)
{
    int datafd;
    int port = 1024 + rand() % 10000;
    while((PORT_listenfd = open_listenfd(port)) < 0)  {
        cout << "PORT bind port failed : " << port << endl;
        port = 1024 + rand() % 10000;
    }

    char temp_str[20];
    sprintf(temp_str, "PORT %d", port);
    string port_str = temp_str;
    cout << port_str << endl;
    write(connectfd, port_str.c_str(), port_str.length() + 1);

    sockaddr_in addr;
    socklen_t addrlen = sizeof(addr);
    datafd = accept(PORT_listenfd, (sockaddr*) &addr, &addrlen);


    return datafd;
}


int command_PASV(int connectfd)
{
    char PASV[] = "PASV";
    write(connectfd, PASV, sizeof(PASV));

    char buf[10];
    read(connectfd, buf, sizeof(buf));

    int port = atoi(buf);

    int datafd;

    if((datafd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
        return -1;

    sockaddr_in pasv_sin;
    pasv_sin.sin_family = AF_INET;
    pasv_sin.sin_port = htons(port);
    pasv_sin.sin_addr = sin.sin_addr;

    cout << "PASV " << port << endl;

    while(connect(datafd, (sockaddr*) &pasv_sin, sizeof(pasv_sin)) < 0);

    return datafd;
}


int open_listenfd(int port)
{
    int listenfd;
    sockaddr_in addr;

    if((listenfd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
        return -1;

    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(port);

    if(bind(listenfd, (sockaddr*) &addr, sizeof(addr)) < 0)
        return -1;

    if(listen(listenfd, 1) < 0 )
        return -1;

    return listenfd;
}
```