#r "../_lib/Fornax.Core.dll"
#r "../_lib/Markdig.dll"
#r "nuget: YamlDotNet"

open System.IO
open Markdig
open System.Text.RegularExpressions
open System
open YamlDotNet.Serialization

type PostConfig = {
    disableLiveRefresh: bool
}
type Post = {
    file: string
    link : string
    title: string
    author: string option
    published: System.DateTime option
    tags: string list
    categories: string list
    content: string
    summary: string
}

type YamlPostConfig () =
    member val title : string = "" with get, set
    member val layout: string = "" with get, set
    member val author: string = "" with get, set
    member val date : DateTime = DateTime.MinValue with get, set
    member val tags : System.Collections.Generic.IList<string> = Unchecked.defaultof<System.Collections.Generic.IList<string>> with get,set
    member val categories : System.Collections.Generic.IList<string> = Unchecked.defaultof<System.Collections.Generic.IList<string>> with get,set


let contentDir = "posts"

let markdownPipeline =
    MarkdownPipelineBuilder()
        .UsePipeTables()
        .UseGridTables()
        .Build()

let isSeparator (input : string) =
    input.StartsWith "---"

let isSummarySeparator (input: string) =
    input.Contains "<!--more-->"

let deserializer = DeserializerBuilder().Build()

let getYamlConfigString (fileContent: string) = 
    let file = fileContent.Trim().Trim('\r').Trim('\n')
    let re = new Regex("---", RegexOptions.Multiline)
    let res = re.Split(file)
    if Array.isEmpty res || res.Length < 2 then
        None
    else 
        let conf = res.[1]
        deserializer.Deserialize<YamlPostConfig>(conf) |> Some



///`fileContent` - content of page to parse. Usually whole content of `.md` file
///returns content of config that should be used for the page
let getConfig (fileContent : string) =
    let fileContent = fileContent.Split '\n'
    let fileContent = fileContent |> Array.skip 1 //First line must be ---
    let indexOfSeperator = fileContent |> Array.findIndex isSeparator
    let splitKey (line: string) =
        let seperatorIndex = line.IndexOf(':')
        if seperatorIndex > 0 then
            let key = line.[.. seperatorIndex - 1].Trim().ToLower()
            let value = line.[seperatorIndex + 1 ..].Trim()
            Some(key, value)
        else
            None
    fileContent
    |> Array.splitAt indexOfSeperator
    |> fst
    |> Seq.choose splitKey
    |> Map.ofSeq

///`fileContent` - content of page to parse. Usually whole content of `.md` file
///returns HTML version of content of the page
let getContent (fileContent : string) =
    let fileContent = fileContent.Split '\n'
    let fileContent = fileContent |> Array.skip 1 //First line must be ---
    let indexOfSeperator = fileContent |> Array.findIndex isSeparator
    let _, content = fileContent |> Array.splitAt indexOfSeperator

    let summary, content =
        match content |> Array.tryFindIndex isSummarySeparator with
        | Some indexOfSummary ->
            let summary, _ = content |> Array.splitAt indexOfSummary
            summary, content
        | None ->
            content, content

    let summary = summary |> Array.skip 1 |> String.concat "\n"
    let content = content |> Array.skip 1 |> String.concat "\n"

    Markdown.ToHtml(summary, markdownPipeline),
    Markdown.ToHtml(content, markdownPipeline)

let trimString (str : string) =
    str.Trim().TrimEnd('"').TrimStart('"')

let loadFile (rootDir: string) (n: string) =
    let text = File.ReadAllText n

    let config = getConfig text
    let yamlconfig = getYamlConfigString text
    let summary, content = getContent text

    let chopLength =
        if rootDir.EndsWith(Path.DirectorySeparatorChar) then rootDir.Length
        else rootDir.Length + 1

    let dirPart =
        n
        |> Path.GetDirectoryName
        |> fun x -> x.[chopLength .. ]

    let file = Path.Combine(dirPart, (n |> Path.GetFileNameWithoutExtension) + ".md").Replace("\\", "/")
    let link = Path.Combine(dirPart, (n |> Path.GetFileNameWithoutExtension) + ".html").Replace("\\", "/")

    let title = match yamlconfig |> Option.bind (fun c -> Some c.title ) with Some s -> s | None -> ""
    let author = yamlconfig |> Option.bind (fun c -> Some c.author)
    let published = 
        config 
        |> Map.tryFind "published" 
        |> Option.orElse (Map.tryFind "date" config)
        |> Option.map (trimString >> System.DateTime.Parse)

    let tags = 
        match yamlconfig |> Option.bind( fun c -> Some c.tags) with 
        | Some lst -> lst |> Seq.toList
        | None -> []

    let categories =
        match yamlconfig |> Option.bind( fun c -> Some c.categories) with 
        | Some lst -> lst |> Seq.toList
        | None -> []

    { file = file
      link = link
      title = title
      author = author
      published = published
      tags = tags
      categories = categories
      content = content
      summary = summary }

let loader (projectRoot: string) (siteContent: SiteContents) =
    let postsPath = Path.Combine(projectRoot, contentDir)
    let options = EnumerationOptions(RecurseSubdirectories = true)
    let files = Directory.GetFiles(postsPath, "*", options)
    files
    |> Array.filter (fun n -> n.EndsWith ".md")
    |> Array.map (loadFile projectRoot)
    |> Array.iter siteContent.Add

    siteContent.Add({disableLiveRefresh = true})
    siteContent
