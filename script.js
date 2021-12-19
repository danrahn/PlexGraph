
window.addEventListener("load", setup);
function setup()
{
    $('#continue').addEventListener('click', getLibraries);
    $('#libraries').addEventListener('change', libraryChanged);
    Tooltip.setTooltip($('#detailHelp'), 'Make legend expandable to show<br>individual items in the category', 50);
    $('#loadExtra').addEventListener('change', extraChanged);
}

let g_loadExtra = false;
function extraChanged()
{
  g_loadExtra = this.checked;
}

function getLibraries()
{
    let token = $('#token').value;
    let url = getHost() + '/library/sections';
    sendHtmlJsonRequest(url, { 'X-Plex-Token' : token }, listLibraries, libraryFail);
}

function getHost()
{
    let host = $('#ip').value.toLowerCase();
    let port = $('#port').value;
    if (!host.startsWith('http'))
    {
        host = `http://${host}`;
    }

    return host + `:${port}`;
}

function listLibraries(data)
{
    let select = document.querySelector('#libraries');
    clearEle(select);
    let libraries = data.MediaContainer.Directory;
    select.appendChild(buildNode('option', { value : '-1', plexType : '-1' }, 'Select...'));
    libraries.forEach(library =>
    {
        select.appendChild(buildNode('option', { value : `${library.key}-${library.type}` }, library.title));
    });
}

function libraryFail(response)
{
    console.log('Something went wrong!');
    console.log(response);
}

function libraryChanged()
{
    const split = this.value.split('-');
    const key = split[0];
    console.log(`Parsing library with id ${key}`);
    const libraryType = getLibraryType(split[1]);
    let dropdown = $('#plexDetail');
    if (dropdown)
    {
        while (dropdown.firstChild)
        {
            dropdown.removeChild(dropdown.firstChild);
        }

        dropdown.setAttribute('libraryKey', key);
        dropdown.setAttribute('libraryType', libraryType);
    }
    else
    {
        dropdown = buildNode(
            'select',
            {
                id : 'plexDetail',
                name : 'plexDetail',
                libraryKey : key,
                libraryType : libraryType
            },
            0,
            { change : parseLibrary });
        $('#plexInfo').appendChild(buildNode('div').appendChildren(
            buildNode('label', { for : 'plexDetail' }, 'Select detail: '),
            dropdown
        ));
    }

    dropdown.appendChild(buildNode('option', { value : 'none' }));

    if (libraryType == -1)
    {
        console.log('Invalid library type. Expected a Movie, TV, or Music library');
        return;
    }

    sendHtmlJsonRequest(
        getHost() + `/library/sections/${key}`,
        { 'X-Plex-Token' : $('#token').value },
        (response) => {
            const details = response.MediaContainer.Directory;
            details.forEach((detail) => {
                if (!detail.secondary)
                {
                    return;
                }

                dropdown.appendChild(buildNode('option', { value : detail.key }, detail.title));
            });

            // Hacky. TV shows don't list 'resolution' as a secondary action, but it is available
            if ($('#plexDetail option[value="resolution"]').length == 0)
            {
                dropdown.appendChild(buildNode('option', { value : 'resolution' }, 'By Resolution'));
            }
        },
        failStd
    );
}

function getLibraryType(libraryType)
{
    const libraryTypes = {
        movie : 1,
        show : 2, season : 3, episode : 4,
        trailer : 5, comic : 6, person : 7,
        artist : 8, album : 9, track : 10,
        photoAlbum : 11, picture : 12, photo : 13, clip : 14, playlistItem : 15
    };

    let libraryTypeKey = libraryTypes[libraryType];
    if (libraryTypeKey > 4 && [8, 9, 10].indexOf(libraryTypeKey) == -1)
    {
        console.log('Invalid library type. Expected a Movie, TV, or Music library');
        return;
    }

    // For TV/Music, parse at the show/album level
    if (libraryTypeKey > 1 && libraryTypeKey < 5)
    {
        libraryTypeKey = 2;
    }
    else if (libraryTypeKey > 7 && libraryTypeKey < 11)
    {
        libraryTypeKey = 9;
    }

    return libraryTypeKey;
}

function parseLibrary()
{
    const detail = $('#plexDetail').value;
    if (detail == 'none')
    {
        return;
    }

    const key = this.getAttribute('libraryKey');
    const libraryType = this.getAttribute('libraryType');
    console.log(`Parsing library with id ${key} by ${detail}`);
    getSectionDetail(key, libraryType, detail);
}

function getSectionDetail(key, libraryType, detail)
{
    let base = getHost() + `/library/sections/${key}`;
    let url = base + `/${detail}`;

    let successFunc = (response) =>
    {
        let data = {};
        let detailList = response.MediaContainer.Directory;
        if (detailList.length > 15)
        {
          if ($('#pieChart'))
          {
            clearEle($('#pieChart'));
          }

          $('#pieChart').innerHTML = `Processed 0 of ${detailList.length}`;
        }

        processDetailSlice(detail, libraryType, detailList, data, getHost() + `/library/sections/${key}`, 0, detailList.length);
    };

    sendHtmlJsonRequest(url, { 'X-Plex-Token' : $('#token').value }, successFunc, failStd);
}

// For some categories (e.g. 'Starring actor'), we can be making hundreds, if not thousands of requests.
// Send them in batches of 20, not sending the next batch until the first 20 are complete to prevent
// completely flooding the server.
function processDetailSlice(detail, libraryType, detailList, data, url, start, max) {
  let end = Math.min(max, start + 20);
  let processed = 0;
  let count = end - start;
  for (let i = start; i < end; ++i) {
    let entry = detailList[i];
    data[entry.key] = { title : entry.title, items : [], count : 0 };

    detailUrl = url;
    let params =
    {
        type : libraryType,
        'X-Plex-Token' : $('#token').value,
        'X-Plex-Container-Start' : 0
    };

    // We have two possibilities. If the DetailList has a 'size' entry, we can
    // use /library/section/#/[Detail]/[Key]. If it doesn't, we need to use
    // /library/sections/#/all?[Detail]=[Key]
    if (entry.hasOwnProperty('size'))
    {
      detailUrl += `/${detail}/${entry.key}`;
    }
    else
    {
      params[detail] = entry.key;
      detailUrl += `/all`;
    }

    // Gross workaround, but when looking at 'by first letter', 'type' is ignored _only_ when looking
    // for "starts with #". If that's the case here, always load the items so we can filter by type
    // after the fact
    if (!g_loadExtra && (libraryType != 2 || entry.key != '%23'))
    {
        params['X-Plex-Container-Size'] = 0;
    }
    sendHtmlJsonRequest(
        detailUrl,
        params,
        (response, request) => {
            if (libraryType == 2 && request.detailKey == '%23')
            {
              response.MediaContainer.Metadata.forEach((item) =>
              {
                if (item.type == 'show')
                {
                  ++data[request.detailKey].count;
                  data[request.detailKey].items.push(item.title);
                }
              });
            }
            else if (g_loadExtra)
            {
                data[request.detailKey].count = response.MediaContainer.size;
                if (response.MediaContainer.Metadata)
                {
                  response.MediaContainer.Metadata.forEach((item) => data[request.detailKey].items.push(item.title));
                }
            }
            else
            {
                data[request.detailKey].count = response.MediaContainer.totalSize;
            }
            --count;
            if (count % 10 == 0)
            {
                $('#pieChart').innerHTML = `Processed ${end} of ${max}`;
            }

            if (count == 0)
            {
              if (end == max)
              {
                showChart(data);
              }
              else
              {
                processDetailSlice(detail, libraryType, detailList, data, url, end, max);
              }
            }
        },
        failStd,
        { detailKey : entry.key }
    );
  }
}

let g_chartData = {};
function showChart(data)
{
    let chart = $('#pieChart');
    while (chart.firstChild)
    {
        chart.removeChild(chart.firstChild);
    }

    chart.appendChild(buildNode('div').appendChildren(
      buildNode('input', { type : 'button', value : '-' }, 0, { 'click' : shrinkChart }),
      buildNode('input', { type : 'button', value : '+' }, 0, { 'click' : growChart })
    ));

    g_chartData = {
        radius : Math.min(500, window.innerWidth * 0.7 / 2),
        points : [],
        title : $('#plexDetail').selectedOptions[0].innerText
    };

    Object.values(data).forEach((point) => {
        g_chartData.points.push({ value : point.count, label : point.title })
    });

    let pie = Chart.pie(g_chartData);
    pie.id = 'mainPie';
    let columns = buildNode('div', { class : 'pie' });
    // columns.appendChild(pie);
    let list = buildNode('ul', { id : 'legend' });

    let values = Object.values(data);
    values.sort((a, b) => b.count - a.count);
    values.forEach((point) => {
        if (g_loadExtra)
        {
            let innerList = buildNode('ul', { class : 'hiddenList' });
            point.items.forEach((item) => innerList.appendChild(buildNode('li', {}, item)));
            list.appendChild(
              buildNode(
                'li',
                { class : 'topDetail' },
                `+ ${point.title}: ${point.count}`,
                { click : expandContractInnerList})
              .appendChildren(innerList)
            );
        }
        else
        {
            list.appendChild(buildNode('li', {}, `${point.title}: ${point.count}` ));
        }
    });
    columns.appendChild(list);
    columns.appendChild(pie);
    chart.appendChild(columns);
}

function expandContractInnerList(e)
{
  let innerList = this.$$('ul');
  if (!innerList || !e.target.classList.contains('topDetail'))
  {
    return;
  }

  if (innerList.classList.contains('hiddenList'))
  {
    innerList.classList.remove('hiddenList');
    this.innerHTML = '- ' + this.innerHTML.substring(2);
  }
  else
  {
    innerList.classList.add('hiddenList');
    this.innerHTML = '+ ' + this.innerHTML.substring(2);
  }
}

function growChart()
{
  resizeChart(50);
}

function shrinkChart()
{
  resizeChart(-50);
}

function resizeChart(delta)
{
  let pie = $('#mainPie');
  pie.setAttribute('width', +pie.getAttribute('width') + delta);
  pie.setAttribute('height', +pie.getAttribute('height') + delta);
}

function failStd()
{
    console.log('Something went wrong!');
}

function clearEle(ele)
{
  while (ele.firstChild)
  {
    ele.removeChild(ele.firstChild);
  }
}