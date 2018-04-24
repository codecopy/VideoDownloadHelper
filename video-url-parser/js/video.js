'use strict';

let ipaddress = '';
getLocalIPs(function(ips) { // <!-- ips is an array of local IP addresses.
    ipaddress = ips.join('-');
});

// save settings
const saveSettings = (showMsg = true) => {
    let settings = {};
    settings['lang'] = $('select#lang').val();
    chrome.storage.sync.set({ 
        video_downloader_settings: settings
    }, function() {
        if (showMsg) {
            alert(get_text('alert_save'));
        }
    });
}

// display video url
function setUrlOffline(url) {
    if (url.includes("weibomiaopai.com")) { // alternative 
        $('div#down').html("<h3>" + get_text("videos_list") + "</h3><ul><li><a target=_blank rel=nofollow href='" + url + "'>" + "<i><font color=gray>" + url + "</font></i></a></li></ul>");
    } else {
        $('div#down').html("<h3>" + get_text("videos_list") + "</h3><ul><li><a target=_blank rel=nofollow href='" + url + "'>" + url + "</a></li></ul>");
    }    
}

// display more than 1 video urls
function setUrlOfflineArray(urls) {
    let urls_length = urls.length;
    let s = "<h3>"+ get_text("videos_list") + "</h3>";
    s += "<ol>";
    for (let i = 0; i < urls_length; ++i) {
        s += "<li><a target=_blank rel=nofollow href='" + urls[i] + "'>" + urls[i].trim2(max_url_length) + "</a></li>";
    }
    s += "</ol>";
    $('div#down').html(s);
}

document.addEventListener('DOMContentLoaded', function() {   
    // init tabs
    $(function() {
        $( "#tabs" ).tabs();
    });

    // load settings
    chrome.storage.sync.get('video_downloader_settings', function(data) {
        if (data && data.video_downloader_settings) {
            let settings = data.video_downloader_settings;
            let lang = settings['lang'];
            $("select#lang").val(lang);
        } else {
            // first time set default parameters
        }
        // about
        let manifest = chrome.runtime.getManifest();    
        let app_name = manifest.name + " v" + manifest.version;
        // version number
        $('textarea#about').val(get_text('application') + ': ' + app_name + '\n' + get_text('chrome_version') + ': ' + getChromeVersion());
        // translate
        ui_translate();
    });
    // save settings when button 'save' is clicked
    $('button#setting_save_btn').click(function() {
        saveSettings();
        // translate
        ui_translate();        
    });  

    // expand m3u8 video list
    const process_m3u8 = (url) => {
        if (url.endsWith("m3u8") || (url.includes("m3u8?"))) {
            let tmp = url.lastIndexOf("/");
            if (tmp != -1) {
                let base_url = url.substr(0, tmp + 1);
                let m3u8 = url;
                $.ajax({
                    type: "GET",
                    url: m3u8,
                    success: function(data) {
                        let lines = data.trim().split(/\s*[\r\n]+\s*/g);
                        let len = lines.length;
                        let m3u8arr = [];
                        for (let i = 0; i < len; ++i) {
                            let line = $.trim(lines[i]);
                            if ((line != null) && (line != '') && (line.length > 2) && (line[0] != '#')) {
                                if ((line.startsWith("http://") || line.startsWith("https://") || line.startsWith("ftp://"))) {
                                    m3u8arr.push(line);
                                } else {
                                    let theurl = base_url + line;
                                    m3u8arr.push(theurl);
                                }
                            }
                        }
                        if (m3u8arr.length == 1) {
                            setUrlOffline(m3u8arr[0]);
                        } else {
                            setUrlOfflineArray(m3u8arr);
                        }
                    },
                    error: function(request, status, error) {},
                    complete: function(data) {}
                });
            }
        }
    }

    let pageurl = '';
    chrome.tabs.getSelected(null, function(tab) {
        pageurl = tab.url;

        let domain = extractDomain(pageurl).toLowerCase();        
        if (!domain.includes('youtube.com')) {
            let s;
            if ($('select#lang').val() != 'en-us') {
                s = 'https://weibomiaopai.com/?url=' + encodeURIComponent(pageurl);
            } else {
                s = 'https://weibomiaopai.com/download-video-parser.php?url=' + encodeURIComponent(pageurl);
            }
            setUrlOffline(s);
        }

        $("#m3u8").click(function() {
            let url = prompt(".m3u8 URL", "https://uploadbeta.com/api/video/test.m3u8");
            process_m3u8(url);
        });

        $("#pic").click(function() {
            let domain = pageurl.replace('http://', '').replace('https://', '').replace('www.', '').split(/[/?#]/)[0];
            if (pageurl.startsWith("http://")) {
                domain = "http://" + domain;
            } else if (pageurl.startsWith("https://")) {
                domain = "https://" + domain;
            }
            $.ajax({
                type: "GET",
                url: pageurl,
                success: function(data) {
                    let tmp = [];
                    let re = /<img\s[^>]*?src\s*=\s*['\"]([^'\"]*?)['\"][^>]*?>/ig;
                    let found = re.exec(data);
                    while (found != null) {
                        let tmp_url = found[1];
                        if ((tmp_url != null) && (tmp_url.length > 0)) {
                            if (tmp_url.startsWith("http://") || tmp_url.startsWith("https://")) {
                                tmp.push(tmp_url);
                            } else {
                                if (tmp_url[0] == '/') {
                                    tmp.push(domain + tmp_url);
                                } else {
                                    tmp.push(domain + '/' + tmp_url);
                                }
                            }
                        }
                        found = re.exec(data);
                    }
                    if (tmp.length > 0) {
                        let s = "<h3>" + get_text("images_list") + "</h3>";
                        s += "<ol>";
                        for (let i = 0; i < tmp.length; ++i) {
                            s += "<li><a target=_blank href='" + tmp[i] + "'>" + tmp[i] + "</a>";
                        }
                        s += "</ol>";
                        $('div#down').html(s);
                    }
                },
                error: function(request, status, error) {},
                complete: function(data) {}
            });
        });
    });

    // get video url from getPageSource.js
    chrome.runtime.onMessage.addListener(function(request, sender) {
        if (request.action == "getSource") {
            let url = JSON.parse(request.source);
            if ((url != null) && (url.constructor == Array)) {
                if (url.length == 1) {
                    setUrlOffline(url[0]);
                } else {
                    setUrlOfflineArray(url);
                }
            } else if (url) {
                url = $.trim(url);
                if (url.length > 0) {
                    let domain1 = extractDomain(url).toLowerCase().replace("www.", "");
                    setUrlOffline(url);
                    process_m3u8(url);
                }
            }
        }
    });
}, false);