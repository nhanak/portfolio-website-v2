# Portfolio Website v2

## Why is this website vanilla JavaScript/HTML/CSS?

There are a few of reasons:

1. Portfolio sites are generally very simple, and do not typically need a framework. 
2. Vanilla websites load extremely quickly and have good SEO.
3. I've been going through Frontend Masters courses by Evgenii Ray, and at least half of the courses contain vanilla solutions which I had 
forgotten/not used in a while. This site will remind me how to work without a framework/what is actually going on under the hood.
4. This site that will only ever be worked on by me.

I've worked with React for years and I still love it, but for this particular job I think its overkill. 

## There's not even a node_modules, how the heck do I serve this thing!

See https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_setup/set_up_a_local_testing_server but tl;dr

```
npx http-server . -o -p 9999
```