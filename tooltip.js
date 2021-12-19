/// Self-pilfered tooltip library (https://github.com/danrahn/PlexWeb/blob/master/script/tooltip.js)
let Tooltip = new function()
{
    let hideTooltipTimer = null;

    window.addEventListener("load", function()
    {
        let frame = $("#plexFrame");
        frame.appendChild(buildNode("div", { id : "tooltip" }));
        frame.addEventListener("scroll", function()
        {
            // On scroll, hide the tooltip (mainly for mobile devices)
            // Add a bit of delay, as it is a bit jarring to have it immediately go away
            if (hideTooltipTimer)
            {
                clearTimeout(hideTooltipTimer);
            }

            hideTooltipTimer = setTimeout(() => { $("#tooltip").style.display = "none"; }, 100);
        });
    });

    this.setTooltip = function(element, tooltip, delay=250)
    {
        this.setText(element, tooltip);
        element.setAttribute("ttDelay", delay);
        element.addEventListener("mousemove", function(e)
        {
            Tooltip.showTooltip(e, this.getAttribute("tt"), this.getAttribute("ttDelay"));
        });

        element.addEventListener("mouseleave", function()
        {
            Tooltip.dismiss();
        });
    };

    this.setText = function(element, tooltip)
    {
        element.setAttribute("tt", tooltip);
        if (showingTooltip && ttElement == element)
        {
            $("#tooltip").innerHTML = tooltip;
        }
    };

    let tooltipTimer = null;
    let showingTooltip = false;
    let ttElement = null;

    this.showTooltip = function(e, text, delay=250)
    {
        // If we have a raw string, shove it in a span first
        if (typeof(text) == "string")
        {
            text = buildNode("span", {}, text);
        }

        if (showingTooltip)
        {
            showTooltipCore(e, text);
            return;
        }

        if (tooltipTimer)
        {
            clearTimeout(tooltipTimer);
        }

        tooltipTimer = setTimeout(showTooltipCore, delay, e, text);
    };

    const windowMargin = 10;
    this.updatePosition = function(clientX, clientY)
    {
        if (!showingTooltip)
        {
            return;
        }

        let tooltip = $("#tooltip");
        let maxHeight = $("#plexFrame").clientHeight - tooltip.clientHeight - 20 - windowMargin;
        tooltip.style.top = (Math.min(clientY, maxHeight) + 20) + "px";
        let avoidOverlay = clientY > maxHeight ? 10 : 0;
        let maxWidth = $("#plexFrame").clientWidth - tooltip.clientWidth - windowMargin - avoidOverlay;
        tooltip.style.left = (Math.min(clientX, maxWidth) + avoidOverlay) + "px";
    };

    let showTooltipCore = function(e, text)
    {
        ttElement = e.target;
        showingTooltip = true;
        let tooltip = $("#tooltip");

        let ttUpdated = ttElement && ttElement.getAttribute("tt");
        if (ttUpdated)
        {
            tooltip.innerHTML = ttUpdated;
        }
        else
        {
            tooltip.innerHTML = "";
            tooltip.appendChild(text);
        }

        tooltip.style.display = "inline";

        let maxHeight = $("#plexFrame").clientHeight - tooltip.clientHeight - 20 - windowMargin;
        tooltip.style.top = (Math.min(e.clientY + window.pageYOffset, maxHeight) + 20) + "px";

        let avoidOverlay = e.clientY > maxHeight ? 10 : 0;
        let maxWidth = $("#plexFrame").clientWidth - tooltip.clientWidth - windowMargin - avoidOverlay;
        tooltip.style.left = (Math.min(e.clientX + window.pageXOffset, maxWidth) + avoidOverlay) + "px";

    };

    this.dismiss = function()
    {
        $("#tooltip").style.display = "none";
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
        showingTooltip = false;
    };

    this.active = function()
    {
        return showingTooltip;
    };
}();
