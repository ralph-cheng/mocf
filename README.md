[![npm](https://img.shields.io/npm/v/mocf.svg?style=flat-square)](https://www.npmjs.com/package/mocf)
[![npm downloads](https://img.shields.io/npm/dm/mocf?color=blue&label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/mocf)

# Mock API Server using Text Files

A straight forward command line mock api server.

Mocks API endpoints from plain text data files.

## Installation ##

```shell
$ npm install -g mocf
```

## Usage ##
```shell
$ mocf -h
Usage: mocf [options] <data_files>

Options:
  -V, --version             output the version number
  -a, --address <host>      ip address to bind (default: "0.0.0.0")
  -p, --port <port>         port to bind (default: 4040)
  --proxy <proxy_target>    proxy requests to another server if there is no endpoint configured here
  --proxypath <proxy_path>  only proxy requests starts with this path prefix, repeatable
  -h, --help                display help for command

```

### Quick Start ###
create a text file, let's call it `data.txt` with the following content
```
/api/hello
{"message": "How are you"}
```

start mocf from command line:
```
$ mocf data.txt
```

start calling your API:
```
$ curl http://localhost:4040/api/hello
```

## Data File ##

`mocf` looks for endpoint informations in the text files. We need to have some special contents in the file. Let's find out what can, and should, be included in these text files.

### Blank Lines ###

Blank lines are ignored, even if you want them in the response body.

Sorry about that, but `mocf` aims to be a good API mock server, so blank-lines-in-responses is not an important feature.

### Comments ###

If a line starts with a hash sign, `#`, it's treated as a comment, and will be ignored.
```
# this is a comment
## no matter how many #'s are there, a comment is a comment ##
```

### URL ###

To start an endpoint in a text file, put a URL on a line by itself, for example

```
https://somedomain.com/api/v1/items
```

protocol and host are ignored, `mocf` will be able to handle the path `/api/v1/items`.

Since `mocf` only cares about URL path, and query string, this line can be just the path, `/api/v1/items`. However, being able to ignore protocol and domain is important, as it allows us to copy just any URL from browser address bar or network development tool.

So far, it responds to `GET` requests to this endpoint with a `200` status and an empty body:

```shell
$ curl -v http://localhost:4040/api/v1/items
*   Trying 127.0.0.1:4040...
* Connected to localhost (127.0.0.1) port 4040 (#0)
> GET /api/v1/items HTTP/1.1
> Host: localhost:4040
> User-Agent: curl/7.70.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Content-Type: text/plain
< Content-Length: 0
< Date: Thu, 09 Jul 2020 13:07:12 GMT
< Connection: keep-alive
<
* Connection #0 to host localhost left intact

```

### Method ###

We can choose to specify an optional HTTP method, like `POST`, `PUT` or any other valid method, by putting it on a line by itself:

```
https://somedomain.com/api/v1/items
POST
```

Now we have to use POST method to access our endpoint:
```shell

$ curl -v http://localhost:4040/api/v1/items             # GET is 404
*   Trying 127.0.0.1:4040...
* Connected to localhost (127.0.0.1) port 4040 (#0)
> GET /api/v1/items HTTP/1.1
> Host: localhost:4040
> User-Agent: curl/7.70.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 404 Not Found
< Content-Security-Policy: default-src 'none'
< X-Content-Type-Options: nosniff
< Content-Type: text/html; charset=utf-8
< Content-Length: 151
< Date: Thu, 09 Jul 2020 13:12:06 GMT
< Connection: keep-alive
<
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/v1/items</pre>
</body>
</html>
* Connection #0 to host localhost left intact

$ curl -v http://localhost:4040/api/v1/items -X POST
*   Trying 127.0.0.1:4040...
* Connected to localhost (127.0.0.1) port 4040 (#0)
> POST /api/v1/items HTTP/1.1
> Host: localhost:4040
> User-Agent: curl/7.70.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Content-Type: text/plain
< Content-Length: 0
< Date: Thu, 09 Jul 2020 13:12:21 GMT
< Connection: keep-alive
<
* Connection #0 to host localhost left intact

```

### Status Code ###

Do the same if we want to use some thing other than `200` for status code:

```
https://somedomain.com/api/v1/items
POST
401
```

### Response ###
After that, we can write as many lines as we want for response body:

```
https://somedomain.com/api/v1/items
POST
401
{
    "error": true,
    "message": "User not signed in."
}
```

If the response text is a valid JSON, `Content-Type` will be `application/json`, otherwise it's `plain/text`:

```shell
$ curl -v http://localhost:4040/api/v1/items -X POST
*   Trying 127.0.0.1:4040...
* Connected to localhost (127.0.0.1) port 4040 (#0)
> POST /api/v1/items HTTP/1.1
> Host: localhost:4040
> User-Agent: curl/7.70.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 401 Unauthorized
< Content-Type: application/json
< Content-Length: 46
< Date: Thu, 09 Jul 2020 13:26:11 GMT
< Connection: keep-alive
<
* Connection #0 to host localhost left intact
{"error":true,"message":"User not signed in."}%
```

If the response body is too big to fit in the data file, we can put it in a separate file, refer to it in the data file.

To refer to another file, start a line with `file:`, followed by path to that file, relative to the data file defining this endpoint:

```
## example/separate-file-for-response.txt

/api/v1/very_large
file:../package-lock.json

```

## Command Line Options ##

`-V` or `--version` output the version number

`-a` or `--address <host>` ip address to bind (default: "0.0.0.0")

`-p` or `--port <port>` port to bind (default: 4040)

`--proxy <proxy_target>` proxy requests to another server if there is no endpoint configured here

`--proxypath <proxy_path>` only proxy requests starts with this path prefix, repeatable

`-h` or `--help` display help for command

`<data_file> [data_file, ...]` one or more data files.

**order is important**, if the same endpoint has been defined in more than one data files, definition from the last file will be used
