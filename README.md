# Mock API From Plain Text Files #

Mock some API endpoint defined in a plain text data file.

## Installation ##

_I haven't publish this yet, so `npm i & npm link`_

## Usage ##
```shell
$ mocf -h
Usage: mocf [options] <data_files>

Options:
  -V, --version         output the version number
  -a, --address <host>  ip address to bind (default: "0.0.0.0")
  -p, --port <port>     port to bind (default: "4040")
  -h, --help            display help for command
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

keep adding more, or make change to, endpoints in your `data.txt`, mocf server will automatically pick them up once you save the file.

## Data File ##

As we have just seen, these files are just plain text files. Every line defines some aspect of some endpoint.

Please see `example/data.txt` for more features of how to define endpoints.
