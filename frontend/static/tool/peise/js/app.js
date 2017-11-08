/*
* app.js - Color Scheme Designer application library

*  Copyright (c) 2009, Petr Stanicek, pixy@pixy.cz ("the author")
*  All rights reserved.
*
*  Redistribution and use in source and binary forms, with or without
*  modification, are permitted provided that the following conditions are met:
*   * Redistributions of source code must retain the above copyright
*     notice, this list of conditions and the following disclaimer.
*   * Redistributions in binary form must reproduce the above copyright
*     notice, this list of conditions and the following disclaimer in the
*     documentation and/or other materials provided with the distribution.
*   * Any commercial use of this software is not allowed unless an exemption
*     was granted by the author.
*
*  This software is provided by the author "as is" and any express or implied
*  warranties, including, but not limited to, the implied warranties or
*  merchantability and fitness for a particular purpose are disclaimed.
*  In no event shall the author be liable for any direct, indirect, incidental,
*  special, exemplary, or consequential damages (including, but not limited to,
*  procurement of substitute goods or services; loss of use, data, or profits;
*  or business interruption) however caused and on any theory of liability,
*  whether in contract, strict liability, or tort (including negligence or
*  otherwise) arising in any way out of the use of this software, even if
*  advised of the possibility of such damage.

*/


// Supporting objects

var drag = {
    on: false,
    dot: null
}

var defs = {
    FPSlimiter: 10, // msec
    MaxRedrawRate: 200, // msec
    dotSize: 7, // half the size
    wheelMid: {
        X: 190,
        Y: 190
    },
    sliderMid: {
        X: 95,
        Y: 95
    },
    sliderWidth: 140,
    CBPreview: 0
}

var API = {
    on: false
}

var SchemeID;

// INIT

$(function () {

    // browser check

    var v = parseInt($.browser.version, 10);
    if ($.browser.msie && v < 7) {
        alert('不再支持IE6内核的浏览器，你可以升级浏览器或使用其他配色器');
        return;
    }

    $('#jscheck').hide();
    $('#canvas').fadeIn(2000);

    // event handlers

    $('a').click(function () {
        $(this).blur()
    });
    $('#model a').click(function () {
        setScheme(this.id);
        return false
    });

    $('#tab-wheel').click(function () {
        togglePane('wheel');
        return false
    });
    $('#tab-vars').click(function () {
        togglePane('vars');
        return false
    });
    $('#tab-info').click(function () {
        togglePane('info');
        return false
    });

    $('#wheel,#saturation,#contrast')
        .bind('mousedown', function (e) {
            e.preventDefault();
            var elm = $(this);
            var pos = elm.offset();
            drag.on = true;
            drag.dW = elm.width();
            drag.dH = elm.height();
            drag.dX = pos.left + drag.dW / 2;
            drag.dY = pos.top + drag.dH / 2;
            elm.bind('mousemove', function (e) {
                e.preventDefault();
                dragMove(e, this);
            });
            if (!drag.dot) dragMove(e, this);
        })
        .bind('mouseup', function (e) {
            e.preventDefault();
            $(this).unbind('mousemove');
            drag.on = false;
            drag.dot = null;
            updateColorData();
        });

    $('.dot')
        .bind('mousedown', function (e) {
            drag.dot = this;
        })
        .bind('mouseup', function (e) {
            drag.dot = null;
        });
    $('#dot1').bind('dblclick', enterHue);
    $('#hue-val').bind('click', enterHue);
    $('#dot2').bind('dblclick', enterComplHue);
    $('#dot3, #dot4').bind('dblclick', enterDist);
    $('#dist-val').bind('click', enterDist);
    $('#rgb-val').bind('click', enterRGB);

    $('#sample-val')
        .bind('dblclick', function (e) {
            var h = prompt('Enter RGB');
        })

    var i, l, p, s = '<option value="">- custom -</option>';
    for (i = 0, l = Palette.Presets.length; i < l; i++) {
        p = Palette.Presets[i];
        s += '<option value="' + p.id + '"';
        if (i == 0) s += ' selected';
        s += '>' + p.name + '</option>';
    }
    $('#presets select').append(s).bind('change', function () {
        usePreset(this.value);
        return false
    }).styledSelect();

    $('#tab-c1').click(function () {
        toggleContrast('c1');
        return false
    });
    $('#tab-c2').click(function () {
        toggleContrast('c2');
        return false
    });

    $('#chk-showtext').click(function () {
        useShowText();
        return true
    });

    $('#tab-preview2').click(function () {
        pagePreview(1);
        return false
    });
    $('#tab-preview3').click(function () {
        pagePreview(2);
        return false
    });

    s = '';
    for (i = 0, l = ColorBlind.typeDesc.length; i < l; i++) {
        p = ColorBlind.typeDesc[i];
        s += '<li><a href="#" onclick="useColorBlind(' + i + ');return false">' + p + '</a></li>';
        if (i == 0) s += '<li class="sep"><hr></li>';
    }
    $('#colorblind').html(s);

    // menu

    $(document).ready(function ()  { 
        $('#menu').droppy({
            speed: 100,
            persist: 250
        });
    }); 
    $('#menu a').not('.link').click(function (e) {
        e.preventDefault();
        $(this).blur()
    }).not('.enable a').addClass('disabled'); 
    $('#menu-undo').click(function () {
        History.back()
    }); 
    $('#menu-redo').click(function () {
        History.fwd()
    }); 
    $('#menu-random-now').click(function () {
        randomScheme()
    });
    $('#menu-random-set').click(function () {
        randomSettings()
    });
    $('#menu-export-txt').click(function () {
        exportCols('txt')
    });
    $('#menu-export-html').click(function () {
        exportCols('html')
    });
    $('#menu-export-xml').click(function () {
        exportCols('xml')
    });
    $('#menu-export-aco').click(function () {
        exportCols('aco')
    });
    $('#menu-export-gpl').click(function () {
        exportCols('gpl')
    });
    $('#menu-tooltips').click(function () {
        useShowTooltips()
    });
    $('#menu-about').click(function () {
        window.open(this.href);
        return false
    });

    // initialize

    var search = document.location.search.substring(1);
    if (search) {
        search = search.split('&');
        var i, l, s, key, val;
        API.data = {};
        for (i = 0, l = search.length; i < l; i++) {
            s = search[i].split('=');
            key = s[0].toString();
            val = s[1].toString();
            API.data[key] = val;
        }
        if (API.data.returnurl) {
            API.on = true;
            if (API.data.format != 'hex' && API.data.format != 'rgb') API.data.format = 'hex';
            if (API.data.method != 'get' && API.data.method != 'post') API.data.format = 'get';
        }
    }

    if (API.on) {
        var str = decodeURIComponent(API.data.label);
        if (!str) str = 'RETURN to original site';
        $('#menu-getpro').click(function () {
            API_finish();
            return false
        }).addClass('sel').html(str + ' &raquo;');
    } else {
        $('#menu-getpro').click(function () {
            loadPage('api');
            return false
        });
    }

    var hash = document.location.hash.substring(1);
    if (hash) loadScheme(hash);
    else {
        usePreset('default');
        updateScheme();
        if (Palette.UseVarsOverlay) toggleContrast('c2');
    }

});

function loadScheme(id) {
    Palette.unserialize(id);
    $('#presets select').get(0).selectedIndex = 0;
    $('#presets select').trigger('change');
    updateScheme();
    if (Palette.UseVarsOverlay) toggleContrast('c2');
}

// API

function API_finish() {

    function col(c, name) {
        var v, s = name + ',';
        for (var i = 0; i < 5; i++) {
            v = c.getVarRGB(i);
            if (i > 0) s += ',';
            if (API.data.format == 'rgb') s += v.R + '-' + v.G + '-' + v.B;
            else s += v.getHex();
        }
        return s;
    }

    function item(key, val) {
        return '<input type="hidden" name="' + key + '" value="' + val + '">';
    }

    var str = '<form id="api-sender">';
    str += item('id', SchemeID);
    str += item('col1', col(Palette.Primary, 'primary'));
    var i = 2;
    if (Palette.Sec1) str += item('col' + i++, col(Palette.Sec1, 'secondary-a'));
    if (Palette.Sec2) str += item('col' + i++, col(Palette.Sec2, 'secondary-b'));
    if (Palette.Compl) str += item('col' + i++, col(Palette.Compl, 'complement'));
    str += '</form>';
    $('#canvas').append(str);
    $('#api-sender').attr('action', decodeURIComponent(API.data.returnurl)).attr('method', API.data.method);
    $('#api-sender').submit();
}

// Actions

function togglePane(id) {
    $('.pane').hide();
    $('#pane-' + id).fadeIn(750);
    $('#tabs-color a').removeClass('sel');
    $('#tab-' + id).addClass('sel').blur();
    if (id == 'wheel') updateWheel();
    else if (id == 'vars') {
        updateVars();
        $('#presets select').trigger('resize');
    } else if (id == 'info') updateSchemeInfo();
}

function toggleContrast(id) {
    $('#tabs-contrast a').removeClass('sel');
    $('#tab-' + id).addClass('sel').blur();
    if (id == 'c1') {
        Palette.resetVarsOverlay();
        $('#manualvars, #ttl-c2').hide();
        $('#contrast, #ttl-c1').fadeIn(750);
        $('#saturation .dotv').hide();
        UseManualVars = false;
    } else {
        $('#contrast, #ttl-c1').hide();
        $('#manualvars, #ttl-c2').fadeIn(750);
        $('#saturation .dotv').show();
        UseManualVars = true;
    }
    updateVars();
}

function setScheme(m) {
    Palette.setScheme(m);
    updateScheme();
}

function usePreset(id) {
    if (!id) return;
    var p = Palette.usePreset(id);
    updateVars();
}

function useColorBlind(n) {
    getProVersion('Color Vision Simulation');
}

function useShowText() {
    var on = $('#chk-showtext:checked').length > 0;
    var s;
    if (on) s = '<div class="text"><span class="row1">Text</span> <span class="row2">Text</span> <span class="row3">Text</span></div>';
    else s = '';
    $('#preview-palette td').html(s);
}

function useShowTooltips() {
    var on = !$('#menu-tooltips').hasClass('sel');
    if (on) showTooltips();
    else hideTooltips();
}

// Redraw

var t0;

function checkFPS_on() {
    t0 = new Date();
}

function checkFPS_off() {
    var t1 = new Date() - t0;
    if (t1 > defs.FPSlimiter) defs.FPSlimiter = t1 + 50;
    else if (t1 < defs.FPSlimiter - 50 && defs.FPSlimiter > 10) defs.FPSlimiter = t1;
    $('#fps').text('fps: ' + Math.round(1 / defs.FPSlimiter * 1000));
}

function updateScheme() {
    var m = Palette.Scheme;
    $('#model a').removeClass('sel');
    $('#' + m).addClass('sel').blur();
    $('#dot2').css('display', Boolean(Palette.Compl) ? 'block' : 'none');
    $('#dot3,#dot4').css('display', Boolean(Palette.Sec1) ? 'block' : 'none');
    $('#dist-val').css('display', Boolean(Palette.Sec1) ? 'block' : 'none');
    updateWheel();
    $('#preview-palette').removeClass().addClass('scheme-' + m);
    if ($('#tab-vars').hasClass('sel')) updateVars();
    if ($('#tab-info').hasClass('sel')) updateSchemeInfo();
}


function updateWheel() {
    checkFPS_on();
    moveDot(1, Palette.Primary);
    moveDot(2, Palette.Compl);
    moveDot(3, Palette.Sec1);
    moveDot(4, Palette.Sec2);
    var rgb = Palette.Primary.Col[0].RGB;
    $('#hue-val span').text(Palette.H + '°');
    $('#rgb-val span').text(rgb.getHex());
    $('#rgb-r').html(Math.round(rgb.R / 255 * 100) + ' %');
    $('#rgb-g').html(Math.round(rgb.G / 255 * 100) + ' %');
    $('#rgb-b').html(Math.round(rgb.B / 255 * 100) + ' %');
    $('#dist-val span').text(Palette.Dist + '°');
    colorize();
    checkFPS_off();
}


// Vars Pane

function updateVars() {
    if (UseManualVars) updateManualVars();
    else {
        $('#saturation').css('background-color', Palette.Primary.Base.RGB.getCSS());
        updateContrast();
    }
    updateSV();
}

function updateSV() {
    checkFPS_on();
    var x, y;
    if (UseManualVars) {
        var v = Palette.getVarOverlay(VarSelected[0], VarSelected[1]);
        x = v[0];
        y = v[1];
        x = x - 0.5;
        y = y - 0.5;
        moveSliderDot('#dots,#dotv' + VarSelected[1], x, -y);
    } else {
        x = Palette.dS;
        y = Palette.dV;
        x = x < 0 ? (x + 1) * 0.9 - 0.5 : 0.4 + x * 0.1;
        y = y < 0 ? (y + 1) * 0.9 - 0.5 : 0.4 + y * 0.1;
        moveSliderDot('#dots', x, -y);
    }
    colorize();
    checkFPS_off();
}

function updateContrast() {
    checkFPS_on();
    var x = Palette.cL,
        y = Palette.cS;
    moveSliderDot('#dotc', x - 0.5, 0.5 - y);
    colorize();
    checkFPS_off();
}


var UseManualVars = false;
var VarSelected = [0, 0];
var ColorHash = {
    'pri': 0,
    'sec1': 1,
    'sec2': 2,
    'compl': 3
};

function updateManualVars() {
    function col(c, id, ttl) {
        var hex, id2, v, s = '<a class="ttl" rel="' + id + '" href="#">' + ttl + ':</a>';
        s += '<div class="var-set" id="var-set-' + id + '">';
        for (var i = 0; i < 5; i++) {
            hex = c.getVarRGB(i).getHex();
            id2 = id + '-' + i;
            s += '<a class="col" rel="' + id2 + '" href="#"><img src="img/e.png" class="cbox bg-' + id2 + '">';
            if (i == 0) s += 'Base color';
            else s += 'Variant ' + i;
            s += '</a>';
        }
        s += '</div>';
        return s;
    }
    var s = '';
    s += col(Palette.Primary, 'pri', '主色');
    if (Palette.Sec1) s += col(Palette.Sec1, 'sec1', '辅助色 A');
    if (Palette.Sec2) s += col(Palette.Sec2, 'sec2', '辅助色 B');
    if (Palette.Compl) s += col(Palette.Compl, 'compl', '互补色');

    $('#manualvars').html(s);
    $('#manualvars a.ttl').click(function () {
        var i, v, id = $(this).attr('rel');
        for (i = 0; i < 5; i++) {
            v = Palette.getVarOverlay(ColorHash[id], i);
            moveSliderDot('#dotv' + i, v[0] - 0.5, -v[1] + 0.5);
        }
        if ($(this).next('.var-set').hasClass('sel')) return false;
        $('#manualvars .var-set.sel').removeClass('sel').slideUp('fast');
        $(this).blur().next('.var-set').addClass('sel').slideDown('fast').find('a.col').eq(0).click();
        return false;
    });
    $('#manualvars a.col')
        .mouseenter(function () {
            var $td = $('#preview-palette').find('.bg-' + $(this).attr('rel')).addClass('hilite');
            if (!$td.html()) $td.html('<div class="text"><span class="row1">Text</span> <span class="row2">Text</span> <span class="row3">Text</span></div>');
        })
        .mouseleave(function () {
            var $td = $('#preview-palette').find('.bg-' + $(this).attr('rel')).removeClass('hilite');
            if ($('#chk-showtext:checked').length == 0) $td.html('');
        })
        .click(function () {
            $('#manualvars a.sel').removeClass('sel');
            $(this).blur().addClass('sel');
            VarSelected = $(this).attr('rel').split('-');
            VarSelected[0] = ColorHash[VarSelected[0]];
            $('#saturation').css('background-color', Palette.getColorByIdx(VarSelected[0]).Base.RGB.getCSS());
            updateSV();
            return false;
        });
    $('#manualvars a.ttl').eq(0).click();
}

// Info pane

function updateSchemeInfo() {
    function col(c, id, ttl) {
        var hex, s = '<h4>' + ttl + ':</h4>';
        s += '<table class="info-table"><tr>';
        for (var i = 0; i < 5; i++) {
            hex = c.getVarRGB(i).getHex();
            s += '<td class="cbox bg-' + id + '-' + i + '"></td><td class="code">' + hex + '</td>';
        }
        s += '</tr></table>';
        return s;
    }
    var s = '';
    s += col(Palette.Primary, 'pri', '主色');
    if (Palette.Sec1) s += col(Palette.Sec1, 'sec1', '辅助色 A');
    if (Palette.Sec2) s += col(Palette.Sec2, 'sec2', '辅助色 B');
    if (Palette.Compl) s += col(Palette.Compl, 'compl', '互补色');

    $('#coltable').html(s);

    colorize();
}


function exportCols(type) {
    getProVersion('Palette Export');
}

// Preview

function pagePreview(nr) {
    var url, ttl, s;
    if (nr == 1) {
        url = '/tool/peise/sample/2';
        ttl = '高明度网页 | <a href="#" onclick="pagePreview(2);return false">低明度网页</a>';
    } else {
        url = '/tool/peise/sample/1';
        ttl = '<a href="#" onclick="pagePreview(1);return false">高明度网页</a> | 低明度网页';
    }
    s = '<div class="sample-info">' + ttl;
    if (Palette.Sec1) s += ' • 点击下面色块来改变辅助色';
    s += '</div><iframe class="sample" scrolling="no" frameborder="0"></iframe>';
    var fl = new $.floatbox({
        content: s,
        button: '<button type="button" class="close-floatbox">Close</button>',
        fade: false,
        boxConfig: {
            position: ($.browser.msie) ? "absolute" : "fixed",
            zIndex: 999,
            width: "840px",
            marginLeft: "-420px",
            height: "auto",
            top: "50%",
            left: "50%",
            backgroundColor: "transparent",
            display: "none"
        }
    });
    $('iframe.sample').attr('src', url);
}

function loadPage(url) {
    var s = '<iframe class="sample" src="' + url + '" scrolling="auto" frameborder="0"></iframe>';
    var fl = new $.floatbox({
        content: s,
        button: '<button type="button" class="close-floatbox">Close</button>',
        fade: false,
        boxConfig: {
            position: ($.browser.msie) ? "absolute" : "fixed",
            zIndex: 999,
            width: "840px",
            marginLeft: "-420px",
            height: "auto",
            top: "50%",
            left: "50%",
            backgroundColor: "transparent",
            display: "none"
        }
    });
    $('iframe.sample').attr('src', url);
}


var Random = {
    Scheme: 1,
    H: 1,
    Dist: 1,
    dS: 1,
    dV: 1,
    cS: 1,
    cL: 1
}

function randomScheme() {
    getProVersion('Randomize Palette');
}

function randomSettings() {
    getProVersion('Randomize Palette');
}


// Colorize Queue

var LastRefresh = 0,
    RefreshTimerID;

function colorize() {
    var t = new Date().valueOf();
    var delta = t - LastRefresh;
    if (delta < defs.MaxRedrawRate) {
        if (!RefreshTimerID) RefreshTimerID = setTimeout(doColorize, defs.MaxRedrawRate - delta);
    } else doColorize();
}

// Colorize

function doColorize() {

    if (RefreshTimerID) clearTimeout(RefreshTimerID);
    RefreshTimerID = null;
    LastRefresh = new Date().valueOf();

    var pri, sec1, sec2, compl;
    var priCol, sec1Col, sec2Col, complCol;

    $('.bg-pri').css('background-color', Palette.Primary.Base.RGB.getCSS());

    for (var i = 0; i < 5; i++) {
        priCol = Palette.Primary.Col[i];
        if (Palette.Compl) complCol = Palette.Compl.Col[i];
        else complCol = Palette.Primary.Col[2];
        if (Palette.Sec1) sec1Col = Palette.Sec1.Col[i];
        else sec1Col = Palette.Primary.Col[3];
        if (Palette.Sec2) sec2Col = Palette.Sec2.Col[i];
        else sec2Col = Palette.Primary.Col[4];

        pri = priCol.RGB;
        compl = complCol.RGB;
        sec1 = sec1Col.RGB;
        sec2 = sec2Col.RGB;

        if (defs.CBPreview) {
            pri = '#' + ColorBlind.getHex(pri.R, pri.G, pri.B, defs.CBPreview);
            compl = '#' + ColorBlind.getHex(compl.R, compl.G, compl.B, defs.CBPreview);
            sec1 = '#' + ColorBlind.getHex(sec1.R, sec1.G, sec1.B, defs.CBPreview);
            sec2 = '#' + ColorBlind.getHex(sec2.R, sec2.G, sec2.B, defs.CBPreview);
        } else {
            pri = pri.getCSS();
            compl = compl.getCSS();
            sec1 = sec1.getCSS();
            sec2 = sec2.getCSS();
        }

        $('.col-pri-' + i).css('color', pri);
        $('.col-compl-' + i).css('color', compl);
        $('.col-sec1-' + i).css('color', sec1);
        $('.col-sec2-' + i).css('color', sec2);
        $('.bg-pri-' + i).css('background-color', pri).each(function () {
            this.paletteInfo = {
                col: priCol,
                out: pri
            }
        });
        $('.bg-compl-' + i).css('background-color', compl).each(function () {
            this.paletteInfo = {
                col: complCol,
                out: compl
            }
        });
        $('.bg-sec1-' + i).css('background-color', sec1).each(function () {
            this.paletteInfo = {
                col: sec1Col,
                out: sec1
            }
        });
        $('.bg-sec2-' + i).css('background-color', sec2).each(function () {
            this.paletteInfo = {
                col: sec2Col,
                out: sec2
            }
        });
        $('.brd-pri-' + i).css('border-color', pri);
        $('.brd-compl-' + i).css('border-color', compl);
        $('.brd-sec1-' + i).css('border-color', sec1);
        $('.brd-sec2-' + i).css('border-color', sec2);

    }
    SchemeID = Palette.serialize();
    var sID = SchemeID;
    if (sID.length > 64) sID = '&lt;ID too long to display&gt;';
    $('#schemeid a').html(sID).attr('href', document.location.pathname + '#' + SchemeID);

    if (!drag.on) updateColorData();

}

function updateColorData() {
    History.add();
    colorTooltips();
}

// History

var History = {
    Ptr: 0,
    add: function () {},
    back: function () {
        getProVersion('Undo')
    },
    fwd: function () {
        getProVersion('Redo')
    }
}

// drag & drop

var moveTimer = 0;

function dragMove(e, elm) {
    var t0 = new Date();
    if (t0 - moveTimer < defs.FPSlimiter) return false;
    moveTimer = t0;
    if (elm.id == 'wheel') moveOnWheel(e);
    else moveOnSlider(e, elm);
}

function moveOnWheel(e) {
    var x, y, h, r, movedHue = false,
        movedDist = false;
    if (e) {
        x = e.pageX - drag.dX;
        y = e.pageY - drag.dY;
        h = Math.round(((Math.atan2(-x, y) * 180 / Math.PI) + 180) % 360);
        r = Math.sqrt(x * x + y * y);
    } else {
        movedHue = true, movedDist = true;
    }
    if (r > 60 && r < 160) {
        var dot = 'dot1';
        if (drag.dot) dot = drag.dot.id;
        if (dot == 'dot1' || dot == 'dot2') {
            if (r > 125) {
                if (r < 135) h = (Math.floor((h - 7.5) / 15 + 1) * 15) % 360;
                else h = (Math.floor((h - 15) / 30 + 1) * 30) % 360;
            }
            if (dot == 'dot2') h = (h + 180) % 360;
            movedHue = Palette.setHue(h);
        } else {
            if (Palette.Scheme == 'm4' && dot == 'dot4') h = (h + 180) % 360;
            movedDist = Palette.setDist(h);
        }
    }
    if (movedHue || movedDist) updateWheel();
}


function moveOnSlider(e, elm) {
    if (UseManualVars) {
        $('#saturation').trigger('mouseup');
        getProVersion('Adjust Variants');
        return;
    }
    var x = e.pageX - drag.dX;
    var y = e.pageY - drag.dY;
    x = x / defs.sliderWidth;
    y = y / defs.sliderWidth;
    if (x < -0.5) x = -0.5;
    if (x > 0.5) x = 0.5;
    if (y < -0.5) y = -0.5;
    if (y > 0.5) y = 0.5;
    if (elm.id == 'saturation') {
        var s, v;
        // -0.5..0.4 => -1..0; 0.4..0.5 => 0..1
        s = x > 0.4 ? (x - 0.4) / 0.1 : (x + 0.5) / 0.9 - 1;
        y = -y;
        v = y > 0.4 ? (y - 0.4) / 0.1 : (y + 0.5) / 0.9 - 1;
        Palette.setSV(s, v);
        updateSV();
    } else if (elm.id == 'contrast') {
        // -0.5..0.5 => 0..1
        var cL = x + 0.5;
        var cS = 0.5 - y;
        Palette.setContrast(cS, cL);
        updateContrast();
    }
    if ($('#presets select').get(0).selectedIndex != 0) {
        $('#presets select').get(0).selectedIndex = 0;
        $('#presets select').trigger('change');
    }
}

function moveDot(n, col) {
    if (!col) return;
    var h = col.Col[0].HSV.H;
    var r = (h - 90) / 360 * 2 * Math.PI;
    x = Math.round(defs.wheelMid.X + 109 * Math.cos(r)) - defs.dotSize;
    y = Math.round(defs.wheelMid.Y + 109 * Math.sin(r)) - defs.dotSize;
    $('#dot' + n).css('left', x + 'px').css('top', y + 'px');
}

function moveSliderDot(sel, x, y) {
    x = defs.sliderMid.X + x * defs.sliderWidth - defs.dotSize + 1;
    y = defs.sliderMid.Y + y * defs.sliderWidth - defs.dotSize + 3;
    $(sel).css('left', x + 'px').css('top', y + 'px');
}


// prompts

function myPrompt(str, val, callback) {
    var s = '<div id="prompt"><p>' + str + '</p>';
    s += '<p class="input"><input id="prompt-input" name="prompt-input" type="text" value="' + val + '"></p>';
    s += '<p class="submit"><button id="prompt-cancel" class="close-floatbox">Cancel</button> <button id="prompt-ok" class="close-floatbox">OK</button></p>';
    s += '</div>';
    var fl = new $.floatbox({
        content: s,
        button: '',
        fade: false,
        boxConfig: {
            position: ($.browser.msie) ? "absolute" : "fixed",
            zIndex: 999,
            width: "360px",
            marginLeft: "-180px",
            height: "auto",
            top: "33%",
            left: "50%",
            backgroundColor: "transparent",
            display: "none"
        }
    });
    $('#prompt-ok').click(function () {
        callback($('#prompt-input').val());
    })
    $('#prompt-input').keypress(function (e) {
        if (e.keyCode == 13) $('#prompt-ok').click()
    }).focus().select();
}

function getExpr(s) {
    if (!s) return '';
    if (s.match(/[0-9\.\+\-\*/ ]+/)) s = eval(s);
    return s;
}

function enterHue() {
    myPrompt('Enter hue (0°–360°)', Palette.H, enterHue2);
}

function enterHue2(h) {
    h = parseInt(getExpr(h), 10) % 360;
    if (h >= 0 && h <= 360) {
        Palette.setHue(h % 360);
        updateWheel();
    }
}

function enterComplHue() {
    myPrompt('Enter complement hue (0°–360°)', (Palette.H + 180) % 360, enterComplHue2);
}

function enterComplHue2(h) {
    h = parseInt(getExpr(h), 10) % 360;
    if (h >= 0 && h <= 360) {
        Palette.setHue((h + 180) % 360);
        updateWheel();
    }
}

function enterDist() {
    var min = Palette.SchemeModel.minD,
        max = Palette.SchemeModel.maxD;
    myPrompt('Enter Distance/Angle (' + min + '°–' + max + '°)', Palette.Dist, enterDist2);
}

function enterDist2(a) {
    var min = Palette.SchemeModel.minD,
        max = Palette.SchemeModel.maxD;
    a = Math.abs(parseInt(getExpr(a), 10));
    if (a >= min && a <= max) {
        Palette.setDistNum(a);
        updateWheel();
    }
}

function enterRGB() {
    myPrompt('Enter RGB value (000000–FFFFFF)', Palette.Primary.getVarRGB(0).getHex(), enterRGB2);
}

function enterRGB2(s) {
    if (s && s.match(/^\s*[0-9a-fA-F]{6}\s*$/)) {
        var r = hex2dec(s.substring(0, 2))
        var g = hex2dec(s.substring(2, 4));
        var b = hex2dec(s.substring(4, 6));
        var rgb = new RGB(r, g, b);
        var hsv = ColorWheel.getColorByRGB(rgb);
        Palette.setHSV(hsv);
        updateWheel();
        $('#presets select').get(0).selectedIndex = 0;
        $('#presets select').trigger('change');
    }
}

function colorTooltips() {
    $('.cbox').tooltip({
        bodyHandler: function () {
            var src = '#' + this.paletteInfo.col.RGB.getHex();
            var out = this.paletteInfo.out;
            var s = src;
            if (defs.CBPreview) s += '<br>(as ' + out + ')';
            return s;
        },
        showURL: false,
        delay: 0,
        fade: 0,
        track: true,
        extraClass: 'color',
        top: 15,
        left: 10
    });
}

function showTooltips() {
    $('#menu-tooltips').addClass('sel').html('Hide Tooltips');
    $('.help').tooltip({
        bodyHandler: function () {
            return $('#help-' + $(this).attr('id')).html();
        },
        showURL: false,
        delay: 0,
        fade: 250,
        track: true,
        left: -50
    });
    if (pageTracker) pageTracker._trackPageview("/pseudo/tooltips.html");
}

function hideTooltips() {
    $('#menu-tooltips').removeClass('sel').html('Show Tooltips');
    $('.help').tooltipOff();
}

function getProVersion(str) {
    var s = '<div id="prompt">';
    if (str) s += '<h4>&raquo; ' + str + ' &laquo;</h4>';
    s += '<p>This feature is not available in the free version. <strong>Get the <a href="getpro.html" target="_blank">Pro Version</a> for more features</strong>, precize color adjustments, customized previews and much more. Check the detailed <a href="getpro.html" target="_blank">feature list</a>.</p>';
    s += '<p>Note: If you have already donated you can have the Pro version licence for free.</p>';
    s += '<p class="submit"><button id="prompt-ok" class="close-floatbox">OK</button></p>';
    s += '</div>';
    var fl = new $.floatbox({
        content: s,
        button: '',
        fade: false,
        boxConfig: {
            position: ($.browser.msie) ? "absolute" : "fixed",
            zIndex: 999,
            width: "360px",
            marginLeft: "-180px",
            height: "auto",
            top: "33%",
            left: "50%",
            backgroundColor: "transparent",
            display: "none"
        }
    });
}