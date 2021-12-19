// self-pilfered common functions, based on https://github.com/danrahn/PlexWeb/blob/master/script/common.js
function sendHtmlJsonRequest(url, parameters, successFunc, failFunc, additionalParams)
{
    let http = new XMLHttpRequest();
    http.open("GET", url + buildQuery(parameters), true /*async*/);
    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    http.setRequestHeader("accept", "application/json");
    attachExtraParams(additionalParams, http);

    http.onreadystatechange = function()
    {
        if (this.readyState != 4)
        {
            return;
        }

        if (this.status != 200)
        {
            let status = Math.floor(this.status / 100);
            if (failFunc && (status == 4 || status == 5 || status == 0))
            {
                failFunc({ Error : "HTTPError", value : this.status });
            }

            return;
        }

        try
        {
            let response = JSON.parse(this.responseText);
            if (response.Error)
            {
                if (failFunc)
                {
                    failFunc(response, this);
                }

                return;
            }

            successFunc(response, this);

        }
        catch (ex)
        {
            console.error('Exception: %o', ex);
            console.error(ex.stack);
            console.error('Response text: %s', this.responseText);
        }
    };

    http.send();
}
function attachExtraParams(extra, http)
{
    if (extra)
    {
        for (let param in extra)
        {
            if (!Object.prototype.hasOwnProperty.call(extra, param))
            {
                continue;
            }

            http[param] = extra[param];
        }
    }
}
function buildQuery(parameters)
{
    let queryString = "";
    let first = true;
    for (let parameter in parameters)
    {
        if (!Object.prototype.hasOwnProperty.call(parameters, parameter))
        {
            continue;
        }

        queryString += `${first ? '?' : '&'}${parameter}=${encodeURIComponent(parameters[parameter])}`;
        first = false;
    }

    return queryString;
}
function $(selector, ele=document)
{
    if (selector.indexOf("#") === 0 && selector.indexOf(" ") === -1)
    {
        return $$(selector, ele);
    }

    return ele.querySelectorAll(selector);
}
function $$(selector, ele=document)
{
    return ele.querySelector(selector);
}
Element.prototype.$ = function(selector)
{
    return $(selector, this);
};
Element.prototype.$$ = function(selector)
{
    return $$(selector, this);
};

function buildNode(type, attrs, content, events)
{
    let ele = document.createElement(type);
    return _buildNode(ele, attrs, content, events);
}

function buildNodeNS(ns, type, attrs, content, events)
{
    let ele = document.createElementNS(ns, type);
    return _buildNode(ele, attrs, content, events);
}

function _buildNode(ele, attrs, content, events)
{
    if (attrs)
    {
        for (let [key, value] of Object.entries(attrs))
        {
            ele.setAttribute(key, value);
        }
    }

    if (events)
    {
        for (let [event, func] of Object.entries(events))
        {
            ele.addEventListener(event, func);
        }
    }

    if (content)
    {
        ele.innerHTML = content;
    }

    return ele;
}
Element.prototype.appendChildren = function(...elements)
{
    for (let element of elements)
    {
        if (element)
        {
            this.appendChild(element);
        }
    }

    return this;
};