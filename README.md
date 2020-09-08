# LogPack

LogPack takes snapshots of your system when unexpected errors occur. A LogPack contains more than just logs. It bundles anything that is required to solve the problem.

# Visual Studio Code extension

A LogPack basically is a zip file. However, the Visual Studio Code extension in this repository is the tool to work with those bundles. In order to package LogPacks, you need to include and SDK and upload them a supported sink. This repository hosts the Visual Studio Code extensions. Check the supported sinks below for links to the other repositories.

## Supported SDKs

| SDK | Repo | Registry |
| - | - | - |
| ASP.NET Core 3.2 | https://github.com/FeatureNinjas/logpack-sdk-net | |

## Supported Sinks

- FTP

# What and Why?

Services that provide logging as a service collect all logs and allow you to search and filter using keywords or specific log files. In production however, we would like to collect as less logs as possible to limit the price for the services. Furthermore, we ran into issues where environment variables were not correctly set in the production or staging environment and had issues with different versions of NuGet packages. Analyzing such issues took us a lot of time which is why we came up with the idea of LogPack. Whenever an unexpected issue happens, collect everything related to this issue and store it packaged as a zip file on an FTP server. So no more logs for API calls with return code 200. But literally everything necessary to analyze failed API calls with return code 500.

> Special note: LogPack is a product created while creating FeatureNinjas. We use it to analyze our server issues. If you want to have more infos on FeatureNinjas, a feature flagging service for developers, then check out https://featureninjas.com.

## Features

- List all log packs from the given FTP server
- Download and open log packs to see traces, ...

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

![LogPack Explorer](images/LogPack%20Explorer.png?raw=true)

## Requirements

Visual Studio Code 1.47 upwards.

## Extension Settings

This extension contributes the following settings:

* `logPack.ftp.server`: FTP server URL
* `logPack.ftp.user`: User name for FTP server access
* `logPack.ftp.password`: Password to access the FTP server

## Known Issues

None known currently... Create issues here or in the other projects for bug reports or feature requests...

# Roadmap

The following list contains features that we're planning to implement in the next updates. Help us prioritize by giving us feedback

- Support for NodeJS
- Add more upload sinks (e.g. OneDrive, AWS, ...)
- Offer online storage so you don't have to care about FTP or any other service 
- ...

Missing something? Create an issue or contact us directly.

## Release Notes

### 0.0.2

Initial release of LogPacks

### 0.1.0

Created first publishable package

### 0.2.0

Added first version of grouping error messages based on return code
