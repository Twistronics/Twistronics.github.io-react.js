---
title: "HTTP服务的简单实现"
date: "2014-03-30T13:15:30Z"
description: "实现一个简单的可以动态加载模块的HTTP服务器。"
tags: 
  - "C/C++"
  - "TCP/IP"
---


实现一个简单的可以动态加载模块的HTTP服务器。

`main.cpp`
```cpp

#include "server.h"

#include <getopt.h>

bool verbose = false;
string modir("./");

void wait_child_process( int sig )
{
    while ( waitpid( -1, NULL, WNOHANG ) > 0 );
}


const char* short_options = "a:hm:p:v";
struct option long_options[] = {
    { "address", 1, NULL, 'a' },
    { "help"   , 0, NULL, 'h' },
    { "modir"  , 1, NULL, 'm' },
    { "port"   , 1, NULL, 'p' },
    { "verbose", 0, NULL, 'v' }
};

void help();


int main( int argc, char** argv )
{
    int c;
    int port = 80;
    in_addr my_addr;
    my_addr.s_addr = htonl( INADDR_ANY );

    while(( c = getopt_long( argc, argv, short_options, long_options, NULL)) != -1 )
    {
        switch( c )
        {
            case 'a':
                my_addr.s_addr = htonl( inet_addr( optarg ) );
                break;

            case 'h':
                help();
                return 0;
                break;

            case 'm':
                modir = optarg;
                break;

            case 'p':
                port = atoi( optarg );
                break;

            case 'v':
                verbose = true;
                break;
        }
    }


    signal( SIGCHLD, wait_child_process );
    server_run( my_addr, port );

    return 0;
}


void help()
{
    cout<<"-a / --address\n";
    cout<<"-h / --help\n";
    cout<<"-m / --modir\n";
    cout<<"-p / --port\n";
    cout<<"-v / --verbose\n";
}
```

`server.h`
```cpp
#ifndef __SERVER_H__
#define __SERVER_H__

#include <iostream>
#include <string>
#include <stdlib.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <stdint.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <signal.h>
using namespace std;


struct server_module  {
    void* handle;
    const char* name;
    void (* generate_function) (int);
};

extern struct server_module* module_open ( const char* module_name );
extern void module_close ( struct server_module* module );
extern void server_run ( struct in_addr local_address, int port );
extern bool verbose;
extern string modir;


#endif
```

`server.cpp`
```cpp

#include "server.h"

int open_listenfd( in_addr local_address, int port )
{
    int listenfd;
    sockaddr_in addr;

    if(( listenfd = socket( PF_INET, SOCK_STREAM, 0 ) ) < 0 )
        return -1;

    int optval = 1;
    if( setsockopt( listenfd, SOL_SOCKET, SO_BROADCAST, (const void*) &optval, sizeof(int) ) < 0 )
        return -1;

    addr.sin_family = AF_INET;
    addr.sin_addr = local_address;
    addr.sin_port = htons ( (unsigned short ) port);

    if( bind( listenfd, (sockaddr*) &addr, sizeof( addr ) ) < 0 )
        return -1;

    if( listen( listenfd, 10 ) < 0 )
        return -1;

    return listenfd;
}

void deal( int connectfd );

void server_run( in_addr local_address, int port )
{
    int listenfd;
    if( ( listenfd = open_listenfd( local_address, port )) < 0)  {
        cout<<"port: "<<port<< " fail" <<endl;
        return;
    }


    sockaddr_in clientaddr;
    socklen_t clientlen = sizeof( clientaddr );

    while( true )  {
        int connectfd = accept( listenfd, (sockaddr*) &clientaddr, &clientlen );


        cout<< "connect ip : " << inet_ntoa( clientaddr.sin_addr ) <<endl;

        if( fork() == 0 )
            deal( connectfd );


        close( connectfd );
    }

}







void http_error( int, string, string );
void home_page(int);

void deal( int connectfd )
{
    const int BUFSIZE = 500;
    char buf[BUFSIZE];

    read( connectfd, &buf, BUFSIZE );

    string request(buf);

    if( verbose )
        cout<<request;


    int pos;
    if( ( pos = request.find("GET") ) == request.npos ) {
        http_error( connectfd, "501", request );
        close( connectfd );
        return;
    }

    int url_start = request.find( "/", pos );
    url_start++;
    int url_end = request.find( " ", url_start );
    string url( request, url_start, url_end - url_start );


    if( url == "" )
        home_page( connectfd );
    else  {
        server_module* mod = module_open( url.c_str() );
        if( !mod )
            http_error( connectfd, "404", url );
        else  {
            (* mod->generate_function ) ( connectfd );
            module_close( mod );
        }
    }

    close( connectfd );
    exit(0);
}



void http_error( int connectfd, string error, string errormsg )
{
    if( error == "404" ) {
        string buf =
            "HTTP/1.0 404 Not Found\r\n"
            "Content-type: text/html\r\n\r\n"
            "<html>\n"
            "<body>\n"
            "<h1>Not Found</h1>\n"
            "<p>The requested URL " + errormsg + " was not found on this server.</p>\n"
            "</body>\n"
            "</html>\n";
        write( connectfd, buf.c_str(), buf.length() );
    } else if ( error == "501" ) {
        string buf =
            "HTTP/1.0 501 Method Not Implemented\r\n"
            "Content-type: text/html\r\n\r\n"
            "<html>\n"
            "<body>\n"
            "<h1>Method Not Implemented</h1>\n"
            "<p>The method is not implemented by this server.</p>\n"
            "</body>\n"
            "</html>\n";
        write( connectfd, buf.c_str(), buf.length() );
    } else if ( error == "400" ) {
        string buf =
            "HTTP/1.0 400 Bad Request\r\n"
            "Content-type: text/html\r\n\r\n"
            "<html>\n"
            "<body>\n"
            "<h1>Bad Request</h1>\n"
            "<p>This server did not understand your request.</p>\n"
            "</body>\n"
            "</html>\n";
        write( connectfd, buf.c_str(), buf.length() );
    }
}

void home_page( int connectfd )
{
    string buf =
        "HTTP/1.0 200 OK\r\n"
        "Content-type: text/html\r\n\r\n"
        "<html>\n"
        "<body>\n"
        "<h1>This is home page</h1>\n"
        "<a href=\"/time\">time</a>\n"
        "<a href=\"/issue\">issue</a>\n"
        "<a href=\"/diskfree\">diskfree</a>\n"
        "<a href=\"/processes\">processes</a>\n"
        "</body>\n"
        "</html>\n";
    write( connectfd, buf.c_str(), buf.length() );
}
```

`module.cpp`
```cpp

#include "server.h"
#include <dlfcn.h>

server_module* module_open ( const char* module_name )
{
    server_module* new_module = new server_module;

    new_module->name = module_name;

    string module_path = modir + string( module_name ) + string(".so");
    new_module->handle = dlopen( module_path.c_str(), RTLD_NOW );

    if( !new_module->handle ) {
        delete new_module;
        return NULL;
    }

    new_module->generate_function = (void (*) (int)) dlsym( new_module->handle, "module_generate" );

    return new_module;
}

void module_close ( server_module* module )
{
    dlclose( module->handle );
    delete module;
}
```

`diskfree.cpp`
```cpp

#include <string>
#include <unistd.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
using namespace std;


extern "C" void module_generate(int);



string header =
"HTTP/1.0 200 OK\r\n"
"Content-type: text/html\r\n\r\n";

void module_generate( int fd )
{
    header +=
        "<html>\n" "<body>\n" "<pre>\n";

    write( fd, header.c_str(), header.length() );

    if( fork() == 0 ) {
        dup2( fd, STDOUT_FILENO );
        system("df");

        header = "\n  </pre></body></html>\n";
        write( fd, header.c_str(), header.length() );
        close( fd );
        exit(0);
    }

    waitpid( -1, NULL, 0 );

}
```


`issue.cpp`
```cpp

#include <iostream>
#include <fstream>
#include <string>
#include <unistd.h>
using namespace std;


extern "C" void module_generate(int);


string header =
    "HTTP/1.0 200 OK\r\n"
    "Content-type: text/html\r\n\r\n";



void module_generate( int fd )
{
    string buf = header;

    ifstream f;
    f.open( "/etc/issue" );

    if( f.bad() ) {
         buf +=
             "<html>\n"
             "<body>\n"
             "<p>Error: Could not open /etc/issue.</p>\n"
             "</body>\n"
             "</html>\n";
    } else {
        string issue = "";
        while( !f.eof() ) {
            string temp;
            getline( f, temp );
            temp += "\n";
            issue += temp;
        }
        buf +=
            "<html>\n"
            "<body>\n"
            "<pre>\n" + issue + "</pre>\n"
            "</body>\n"
            "</html>\n";

    }

    f.close();
    write( fd, buf.c_str(), buf.length() );
}
```

`processes.cpp`
```cpp


#include <unistd.h>
#include <iostream>
#include <stdlib.h>
#include <string>
#include <sys/wait.h>
#include <fstream>
using namespace std;



extern "C" void module_generate( int );


string header =
    "HTTP/1.0 200 OK\r\n"
    "Content-type: text/html\r\n\r\n";




void module_generate( int fd )
{

    system("ps axo pid,comm,user,pgid,rss > tempps");


    string buf = header +
        "<html>\n"
        "<body>\n"
        "<table cellpadding=\"4\" cellspacing=\"0\" border=\"1\">\n"
        "<thread>\n"
        "<tr>\n"
        "<th>PID</th>\n"
        "<th>Program</th>\n"
        "<th>User</th>\n"
        "<th>Group</th>\n"
        "<th>RSS&nsp;(KB)</th>\n"
        "</tr>\n";


    ifstream f;
    f.open( "tempps" );

    string temp;
    getline( f, temp );

    string temp_buf = "";

    while( !f.eof() ) {
        buf += temp_buf;
        temp_buf =
            "<thread>\n"
            "<tr>\n";

        for( int i = 0; i < 4; i++ ) {
            f>>temp;
            temp_buf += "<th>" + temp + "</th>\n";
        }

        getline( f, temp );
        temp_buf += "<th>" + temp + "</th>\n";

        temp_buf +=
            "</tr>\n"
            "</thread>\n";
    }

    buf +=
        "<tbody>\n"
        "</table>\n"
        "</body>\n"
        "</html>\n";

    write( fd, buf.c_str(), buf.length() );

    f.close();
    system( "rm tempps" );

}
```

`time.cpp`
```cpp


#include <unistd.h>
#include <string>
#include <time.h>

using namespace std;

extern "C" void module_generate(int);


string header =
    "HTTP/1.0 200 OK\r\n"
    "Content-type: text/html\r\n\r\n";


void module_generate( int fd )
{
    time_t now_time = time(NULL);

    string buf = header +
        "<html>\n"
        "<head>\n"
        "<meta http-equiv=\"refresh\" content=\"5\">\n"
        "</head>\n"
        "<body>\n"
        "<p>The current time is " + ctime( &now_time ) + ".</p>\n"
        "</body>\n"
        "</html>\n";

    write( fd, buf.c_str(), buf.length() );

}
```


`makefile`
```makefile
objects = main.cpp server.cpp module.cpp
server : $(objects) server.h time.so issue.so diskfree.so processes.so
	g++ -o server $(objects) -ldl

time.so : time.cpp
	g++ -fPIC -shared time.cpp -o time.so
issue.so : issue.cpp
	g++ -fPIC -shared issue.cpp -o issue.so
diskfree.so : diskfree.cpp
	g++ -fPIC -shared diskfree.cpp -o diskfree.so
processes.so : processes.cpp
	g++ -fPIC -shared processes.cpp -o processes.so
```

