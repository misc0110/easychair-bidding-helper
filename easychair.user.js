// ==UserScript==
// @name         EasyChair Bidding Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Little helper for paper bidding
// @author       Michael Schwarz
// @match        https://easychair.org/conferences/selection.cgi?a=*
// @icon         https://easychair.org/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @require http://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==
/* eslint-env jquery */


var all_abstracts = {};
var threshold;

function updateKeywords() {
    var kws = jQuery("#keyword_list").val().split(",");
    var nos = jQuery("#nogo_list").val().split(",");
    var abstracts = jQuery("div");
    GM_setValue("keywords", jQuery("#keyword_list").val());
    GM_setValue("nogo", jQuery("#nogo_list").val());
    threshold = parseInt(jQuery("#thresh").val());
    GM_setValue("threshold", threshold);

    var adjusted_topic_score = [];

    var kw_re = [];
    for(let kw of kws) {
        if(kw.trim().length > 0) {
            kw_re.push(new RegExp(kw.trim(), "ig"));
        }
    }
    var no_re = [];
    for(let n of nos) {
        if(n.trim().length > 0) {
            no_re.push(new RegExp(n.trim(), "ig"));
        }
    }
    var h = 0, hn = 0;

    for(let a of abstracts) {
        if(a.innerHTML.indexOf("<b>Abstract") == -1) continue;
        var h_c = false;
        var hn_c = false;
        var aid = jQuery(a).parent().parent().find("a:first").text();
        if(isNaN(aid)) continue;
        var link = jQuery(a).parent().parent().attr("id");
        var topic_score = 0;
        var was_adjusted = false;
        var txt = all_abstracts[aid];
        for(var i = 0; i < kws.length; i++) {
            if(txt.match(kw_re[i])) {
                topic_score += 2;
                was_adjusted = true;
                if(!h_c) {
                    h_c = true;
                    h++;
                }
            }
            txt = txt.replace(kw_re[i], "<span style='background-color: yellow; font-weight: bold;'>$&</span>");
        }
        for(i = 0; i < nos.length; i++) {
            if(txt.match(nos[i])) {
                topic_score -= 5;
                was_adjusted = true;
                if(!hn_c) {
                    hn_c = true;
                    hn++;
                }
            }
            txt = txt.replace(no_re[i], "<span style='background-color: red; font-weight: bold; color: white;'>$&</span>");
        }
        if(was_adjusted) {
            a.innerHTML = txt;
        } else {
            topic_score -= 4;
        }
        adjusted_topic_score.push([aid, topic_score, link]);
    }

    jQuery("#keyword_matches").text(h + " matched papers");
    jQuery("#nogo_matches").text(hn + " matched papers");

    adjusted_topic_score.sort(function(first, second) { return second[1] - first[1]; });

    var interesting = "";
    for(let sc of adjusted_topic_score) {
        if(sc[1] >= threshold) {
            interesting += "<a href='#" + sc[2] + "'>#" + sc[0] + "</a> ";
        } else break;
    }
    if(interesting == "") {
        jQuery("#suggest_list").html("<i>No paper matches your keywords</i>");
    } else {
        jQuery("#suggest_list").html(interesting);
    }


}

function saveAbstracts() {
    var abstracts = jQuery("div");
    for(var i = 0; i < abstracts.length; i++) {
        if(abstracts[i].innerHTML.indexOf("<b>Abstract") != -1) {
            var pid = jQuery(abstracts[i]).parent().parent().find("a:first").text();
            if(isNaN(pid)) continue;
            //console.log(pid); //.children("td > a"));//.find("a").innerText);
            all_abstracts[pid] = abstracts[i].innerHTML;
        }
    }
}

function waitForElement(sel, cb) {
    //console.log("waiting for " + sel);
    if(jQuery(sel)) {
        cb();
    }
    else setTimeout(function() { waitForElement(sel, cb); }, 100);
}

function init() {
    jQuery.noConflict();
    jQuery(".shortcut").append("<table><tr><td>Highlight (comma-separated list):</td><td><input type='text' id='keyword_list' style='width: 95%'></td><td><span id='keyword_matches'></span></td></tr>" +
                          "<tr><td>Red flags (comma-separated list):</td><td><input type='text' id='nogo_list'  style='width: 95%'></td><td><span id='nogo_matches'></span></td></tr>" +
                          "<tr><td>Suggestions:</td><td colspan=2><span id='suggest_list'></span> (Threshold: <input type='number' id='thresh' />)</td></tr></table>");
    saveAbstracts();

    jQuery("#keyword_list").on("blur", updateKeywords);
    jQuery("#nogo_list").on("blur", updateKeywords);
    var kw = GM_getValue("keywords", "");
    if(kw != "") {
        jQuery("#keyword_list").val(kw);
    }
    var nogos = GM_getValue("nogo", "");
    if(nogos != "") {
        jQuery("#nogo_list").val(nogos);
    }
    threshold = GM_getValue("threshold", 10);
    jQuery("#thresh").val(threshold);
    if(nogos != "" || kw != "") updateKeywords();

    jQuery("#thresh").on("blur", updateKeywords);
}

(function() {
    waitForElement("div.shortcut", init);

})();
 
