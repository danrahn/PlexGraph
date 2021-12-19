/// Self-pilfered chart library (https://github.com/danrahn/PlexWeb/blob/master/script/chart.js)
let Chart = new function()
{
    this.pie = function(data)
    {
        if (!data.noSort)
        {
            data.points.sort((a, b) => a.value - b.value);
        }

        let total = data.points.reduce((acc, cur) => acc + cur.value, 0);

        let r = data.radius;
        let hasTitle = data.title && !data.noTitle;
        let titleOffset = hasTitle ? 40 : 0;
        let svg = makeSvg(r * 2, r * 2 + titleOffset);
        --r; // Need space for border
        let cumulative = 0;
        let colors = data.colors ? data.colors : ["#FFC000", "#5B9BD5", "#A5A5A5", "#70AD47", "#4472C4", "#ED7D31"];
        let colorIndex = 0;
        for (let point of data.points)
        {
            let startPoint = getPoint(r, cumulative, total);
            let d = `M ${r} ${r + titleOffset} L ${startPoint.x} ${startPoint.y + titleOffset} `;

            cumulative += point.value;

            let endPoint = getPoint(r, cumulative, total);
            let sweep = (point.value > total / 2) ? "1" : "0";
            d += `A ${r} ${r} ${sweep} ${sweep} 0 ${endPoint.x} ${endPoint.y + titleOffset} `;
            d += `L ${endPoint.x} ${endPoint.y + titleOffset} ${r} ${r + titleOffset}`;
            let slice = buildPieSlice(d, colors[colorIndex++ % colors.length]);

            let label = buildPieTooltip(point, total, data.labelOptions);
            if (label.length != 0)
            {
                addTooltip(slice, label);
            }

            svg.appendChild(slice);
        }

        if (hasTitle)
        {
            svg.appendChild(buildCenteredText(titleOffset - 20, data.title, 18));
        }

        return svg;
    };

    let buildPieSlice = function(definition, fill)
    {
        return buildNodeNS("http://www.w3.org/2000/svg",
            "path",
            {
                d : definition,
                fill : fill,
                stroke : "#616161",
                "pointer-events" : "all",
                xmlns : "http://www.w3.org/2000/svg"
            },
            0,
            {
                mouseenter : highlightPieSlice,
                mouseleave : function() { this.setAttribute("stroke", "#616161"); }
            });
    };

    let buildCenteredText = function(y, text, size)
    {
        return buildNodeNS(
            "http://www.w3.org/2000/svg",
            "text",
            {
                x : "50%",
                y : y,
                fill : "#c1c1c1",
                "text-anchor" : "middle",
                "font-weight" : "bold",
                "font-size" : size + "pt"
            },
            text
        );
    };

    let buildPieTooltip = function(point, total, labelOptions)
    {
        let label = "";
        let percentage = (point.value / total * 100).toFixed(2);
        if (!labelOptions)
        {
            return `${point.label} (${percentage}%)`;
        }

        if (labelOptions.name === undefined || labelOptions.name)
        {
            label += point.label;
        }

        if (labelOptions.count)
        {
            label += ` - ${point.value}`;
        }

        if (labelOptions.percentage === undefined || labelOptions.percentage)
        {
            label += ` (${percentage}%)`;
        }

        return label;
    };

    let highlightPieSlice = function()
    {
        // Setting this element to be the last will ensure that
        // the full outline is drawn (i.e. not covered by another slice)
        let parent = this.parentNode;
        parent.removeChild(this);
        parent.appendChild(this);
        this.setAttribute("stroke", "#c1c1c1");
    };

    let addTooltip = function(element, label)
    {
        Tooltip.setTooltip(element, label, 50);
    };

    let getPoint = function(radius, value, total)
    {
        // Need to translate coordinate systems
        let angle = (value / total) * Math.PI * 2;
        let x = radius * Math.cos(angle) + radius + 1; // + 1 to account for stroke border
        let y = radius - radius * Math.sin(angle) + 1;
        return { x : x, y : y };
    };

    let makeSvg = function(width, height)
    {
        return buildNodeNS(
            "http://www.w3.org/2000/svg",
            "svg",
            {
                width : width,
                height : height,
                viewBox : `0 0 ${width} ${height}`,
                xmlns : "http://www.w3.org/2000/svg",
                x : 0,
                y : 0
            });
    };
}();