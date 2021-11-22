#r "../_lib/Fornax.Core.dll"
#load "layout.fsx"

open Html
open System.Reflection.Metadata.Ecma335

let tagsURL = "tags"
let tagUrl tag = $"{tagsURL}/{tag}"
let getUrlForTag tag = $"tags/{tag}.html"

let viewPostListItem (post: Postloader.Post) = 
  div [Class "block"] [
    a [Href post.link] [ 
      h3 [] [!! post.title]
    ]
    div [Class "Columns"] (
      let s = span [] [!! (Layout.published post) ]
      let t = post.tags |> List.map (fun t -> span [Class "tag is-primary"] [!! t] )
      s::t
    )
  ]

let viewPostList (tag: string) (posts: Postloader.Post list) = 
    div [Class "panel"; Id tag] [
      div [Class "panel-heading"] [
        div [Class "tag is-info"] [ !! tag ]
      ]
      div [Class "panel-block"] [
        div [Class "content"] 
            (posts |> List.map viewPostListItem)
      ]
    ]
  


let generate' (ctx : SiteContents) (_: string) =
  let posts = ctx.TryGetValues<Postloader.Post> () |> Option.defaultValue Seq.empty 

  let tagNames = query{
    for p in posts do
        for tags in p.tags do
            select tags
            distinct 
    }
  let tagNames = tagNames |> Seq.toList

  let siteInfo = ctx.TryGetValue<Globalloader.SiteInfo> ()
  let desc, postPageSize =
    siteInfo
    |> Option.map (fun si -> si.description, si.postPageSize)
    |> Option.defaultValue ("", 10)



  let layoutForTag tag = 
      posts 
      |> Seq.where (fun p -> List.contains tag p.tags )
      |> Seq.toList
      |> viewPostList tag

  let tags = 
    tagNames 
    |> List.sortBy id
    |> List.map (fun tag -> 
        layoutForTag tag 
        )

  div [Class "container"] [
      section [Class "hero is-info is-medium is-bold"] [
        div [Class "hero-body"] [
            div [Class "container has-text-centered"] [
                h1 [Class "title"] [!!desc]
            ]
        ]
      ]
      section [Class "articles"] [
          div []  tags 
      ]
  ]
   


let generate (ctx : SiteContents) (projectRoot: string) (page: string) =
  let cnt = generate' ctx "" 
  Layout.layout ctx "tags" [cnt]
  |> Layout.render ctx 