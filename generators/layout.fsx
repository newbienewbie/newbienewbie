#r "../_lib/Fornax.Core.dll"
#if !FORNAX
#load "../loaders/postloader.fsx"
#load "../loaders/pageloader.fsx"
#load "../loaders/globalloader.fsx"
#endif

open Html

let baseUrl () =
    "/newbienewbie/"

let injectWebsocketCode (webpage:string) =
    let websocketScript =
        """
        <script type="text/javascript">
          var wsUri = "ws://localhost:8080/websocket";
      function init()
      {
        websocket = new WebSocket(wsUri);
        websocket.onclose = function(evt) { onClose(evt) };
      }
      function onClose(evt)
      {
        console.log('closing');
        websocket.close();
        document.location.reload();
      }
      window.addEventListener("load", init, false);
      </script>
        """
    let head = "<head>"
    let index = webpage.IndexOf head
    webpage.Insert ( (index + head.Length + 1),websocketScript)

let insertDocType (webpage: string) = 
    "<!DOCTYPE html>" + webpage

let createKatexFormulaScript () = 
  """
 // 处理形如 <code>$E=mc^2$</code> 形式的公式
  var inlineMathNodes=document.querySelectorAll('code');
  var re=/^\$(.*)\$$/;
  for(var j=0;j<inlineMathNodes.length;j++){
    var result=re.exec(inlineMathNodes.item(j).innerText);
    if(result!==null){
      katex.render(result[1], inlineMathNodes.item(j));
    }
  }
  function removeNode(node){
    if(node.remove){
      node.remove();
    }else{
      return first.parentNode.removeChild(node);
    }
  };

  // 查找所有 pre code.language-math 节点 以备筛出数据公式
  var nodes=document.querySelectorAll("pre code.language-math");
  for(var i=0;i<nodes.length;i++){
    var node=nodes.item(i);
    // 魔术标记所在行 
    try{
      var lines = node.innerText.split('\n');
      if((!!lines) && lines.length > 0)
      {
        var first = lines[0];
        if(first.trim().match(/%%(\s?)*KaTeX(\s?)*/i)){
          var views = "";
          // 逐行渲染
          for(var k=1; k <lines.length; k++){
              var f=lines[k];
              views += katex.renderToString(f);
          }
          // 消除父级嵌套 
          try{
            node.innerHTML=views;
          }catch(e){
            // IE9 don't support the method of assignning value to tr.innerHTML. Maybe the code below will be removed in the future
            console.log('IE9 sucks',e);
            $(tr).html(node.innerHTML);
          }
        }
      }
    }
    catch(err){
      console.log(err)
    }
  }
    """

let katexFormulaScript = createKatexFormulaScript ()

let layout (ctx : SiteContents) active bodyCnt =
    let pages = ctx.TryGetValues<Pageloader.Page> () |> Option.defaultValue Seq.empty
    let siteInfo = ctx.TryGetValue<Globalloader.SiteInfo> ()
    let ttl =
      siteInfo
      |> Option.map (fun si -> si.title)
      |> Option.defaultValue ""

    let menuEntries =
      pages
      |> Seq.map (fun p ->
        let cls = if p.title = active then "navbar-item is-active" else "navbar-item"
        a [Class cls; Href p.link] [!! p.title ])
      |> Seq.toList

    html [] [
        head [] [
            meta [CharSet "utf-8"]
            meta [Name "viewport"; Content "width=device-width, initial-scale=1"]
            title [] [!! ttl]
            ``base`` [baseUrl () |> Href ]
            link [Rel "icon"; Type "image/png"; Sizes "32x32"; Href "/images/favicon.png"]
            link [Rel "stylesheet"; Href "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"]
            link [Rel "stylesheet"; Href "https://fonts.googleapis.com/css?family=Open+Sans"]
            link [Rel "stylesheet"; Href "https://unpkg.com/bulma@0.8.0/css/bulma.min.css"]
            link [Rel "stylesheet"; Type "text/css"; Href "style/style.css"]
            //link [Rel "stylesheet"; Href "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/shades-of-purple.min.css"]
            //link [Rel "stylesheet"; Href "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/arta.min.css"]
            link [Rel "stylesheet"; Href "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/atom-one-dark-reasonable.min.css"]
            script[ Src "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/highlight.min.js"] []

        ]
        body [] [
          nav [Class "navbar"] [
            div [Class "container"] [
              div [Class "navbar-brand"] [
                a [Class "navbar-item"; Href ""] [
                  img [Src "images/bulma.png"; Alt "Logo"]
                ]
                span [Class "navbar-burger burger"; Custom ("data-target", "navbarMenu")] [
                  span [] []
                  span [] []
                  span [] []
                ]
              ]
              div [Id "navbarMenu"; Class "navbar-menu"] menuEntries
            ]
          ]
          yield! bodyCnt

          link [Href "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.10.1/katex.min.css";  Rel "stylesheet"] 
          script [Src "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"] []
          script [Src "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.10.1/katex.min.js"] []
          script [] [
            !! katexFormulaScript
          ]
          script [][
            !! "hljs.highlightAll();"
          ]
        ]
    ]

let render (ctx : SiteContents) cnt =
  let disableLiveRefresh = ctx.TryGetValue<Postloader.PostConfig> () |> Option.map (fun n -> n.disableLiveRefresh) |> Option.defaultValue false
  cnt
  |> HtmlElement.ToString
  |> fun n -> if disableLiveRefresh then n else injectWebsocketCode n
  |> insertDocType

let published (post: Postloader.Post) =
    post.published
    |> Option.defaultValue System.DateTime.Now
    |> fun n -> n.ToString("yyyy-MM-dd")

let postLayout (useSummary: bool) (post: Postloader.Post) =
    div [Class "card article"] [
        div [Class "card-content"] [
            div [Class "media-content has-text-centered"] [
                p [Class "title article-title"; ] [ a [Href post.link] [!! post.title]]
                p [Class "subtitle is-6 article-subtitle"] [
                a [Href "#"] [!! (defaultArg post.author "")]
                !! (sprintf "on %s" (published post))
                ]
            ]
            div [Class "content article-body"] [
                !! (if useSummary then post.summary else post.content)

            ]
        ]
    ]
