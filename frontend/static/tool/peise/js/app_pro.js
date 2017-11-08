
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



// INIT

$(function() {
	$('#menu a').removeClass('disabled');
//	$('#menu-getpro, #relatedlinks').hide();
	$('#preview-palette .cbox').click( function(){
		if ($('#tab-vars').hasClass('sel') && UseManualVars) {
			var rel = $(this).attr('rel');
			var id = rel.split('-'); id = id[0];
			$('#manualvars a.ttl').filter( function(){ return $(this).attr('rel')==id } ).click();
			$('#manualvars a.col').filter( function(){ return $(this).attr('rel')==rel } ).click();
			}
		return false;
		});

	History.updateMenu();
	});


History = {
	List : [],
	Ptr : -1,
	add : function() {
		if (this.Ptr<0 || this.List[this.Ptr]!=SchemeID) {
			if (this.List.length>this.Ptr+1) this.List = this.List.splice(0,this.Ptr+1);
			this.List.push(SchemeID);
			this.Ptr++;
			this.updateMenu();
			}
		},
	back : function () {
		if (this.Ptr<1) return;
		this.Ptr--;
		loadScheme(this.List[this.Ptr]);
		this.updateMenu();
		},
	fwd : function () {
		if (this.Ptr>=this.List.length-1) return;
		this.Ptr++;
		loadScheme(this.List[this.Ptr]);
		this.updateMenu();
		},
	updateMenu : function () {
		if (this.Ptr>0) $('#menu-undo').removeClass('disabled');
		else $('#menu-undo').addClass('disabled');
		if (this.Ptr<this.List.length-1) $('#menu-redo').removeClass('disabled');
		else $('#menu-redo').addClass('disabled');
		}
	}


function randomScheme() {
	var Scheme = Random.Scheme ? 'm' + Math.ceil(Math.random()*6) : Palette.Scheme;
	var H = Random.H ? Math.floor(Math.random()*360) : Palette.H;
	var Dist = Random.Dist ? 5 + Math.round(Math.random()*55) : Palette.Dist;
	var dS = Random.dS ? -1 + Math.random()*2 : Palette.dS;
	var dV = Random.dV ? -1 + Math.random()*2 : Palette.dV;
	var cS = Random.cS ? Math.random() : Palette.cS;
	var cL = Random.cL ? Math.random() : Palette.cL;
	Palette.setAll(Scheme,H,Dist,dS,dV,cS,cL);
	updateScheme();
	updateWheel();
	updateVars();
	updateSchemeInfo();
	}

function randomSettings() {
	function chkbox(id,label,on) {
		return '<p class="input chkbox"><input id="'+id+'" type="checkbox"'+ (on ? ' checked':'') +'> <label for="'+id+'">'+label+'</label></p>';
		}
	var s = '<div id="prompt"><h4>Randomize Parameters:</h4>';
	s += chkbox('rnd-scheme','Color scheme model',Random.Scheme);
	s += chkbox('rnd-h','Hue',Random.H);
	s += chkbox('rnd-d','Angle/Distance',Random.Dist);
	s += chkbox('rnd-ds','Saturation',Random.dS);
	s += chkbox('rnd-dv','Brightness',Random.dV);
	s += chkbox('rnd-cs','Contrast (Shadows)',Random.cS);
	s += chkbox('rnd-cl','Contrast (Lights)',Random.cL);
	s += '<p class="submit"><button id="prompt-cancel" class="close-floatbox">Cancel</button> <button id="prompt-ok" class="close-floatbox">OK</button></p>';
	s += '</div>';
	var fl = new $.floatbox({
		content:s,
		button: '',
		fade:false,
		boxConfig : {
			position : ($.browser.msie) ? "absolute" : "fixed",
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
	$('#prompt-ok').click( function(){
		Random.Scheme = $('#rnd-scheme:checked').length;
		Random.H = $('#rnd-h:checked').length;
		Random.Dist = $('#rnd-d:checked').length;
		Random.dS = $('#rnd-ds:checked').length;
		Random.dV = $('#rnd-dv:checked').length;
		Random.cS = $('#rnd-cs:checked').length;
		Random.cL = $('#rnd-cl:checked').length;
		} )
	$('#prompt-input').keypress( function(e){ if(e.keyCode==13) $('#prompt-ok').click() } ).focus().select();
	}


function exportCols(type) {

	function col(c,id,ttl) {
		var s = '"'+id+'":{"ttl":"'+ttl+'","col":[';
		for (var i=0;i<5;i++) {
			v = c.getVarRGB(i);
			code = v.getHex();
			if (i>0) s += ',';
			s += '{"hex":"'+code+'","r":'+v.R+',"g":'+v.G+',"b":'+v.B+'}';
			}
		s += ']}';
		return s;
		}

	var s = '{\
"type":"'+type+'",\
"id":"'+SchemeID+'",\
"scheme":{';
	s += col(Palette.Primary, 'primary','主色');
	if (Palette.Sec1) s += ',' + col(Palette.Sec1, 'secondary-a','辅助色 A');
	if (Palette.Sec2) s += ',' + col(Palette.Sec2, 'secondary-b','辅助色 B');
	if (Palette.Compl) s += ',' + col(Palette.Compl, 'complement','互补色');
	s += '}}';
	
	$('#form').attr('action','http://colorschemedesigner.com/export/').attr('method','POST').attr('target','_blank');
	$('#form-data').val(s);
	$('#form').submit();
	
	}

function useColorBlind(n) {	
	defs.CBPreview = n;
	$('#menu-vision, #colorblind a').removeClass('sel');
	if (n>0) {
		$('#menu-vision').addClass('sel');
		$('#colorblind a').eq(n).addClass('sel');
		$('#cb-warning').show();
		}
	else {
		$('#cb-warning').hide();
		}
	colorize();
	}

function moveOnSlider(e,elm) {
	var x = e.pageX - drag.dX;
	var y = e.pageY - drag.dY;
	x = x / defs.sliderWidth;
	y = y / defs.sliderWidth;
	if (x<-0.5) x = -0.5; if (x>0.5) x = 0.5;
	if (y<-0.5) y = -0.5; if (y>0.5) y = 0.5;
	if (elm.id=='saturation') {
		var s,v;
		if (UseManualVars) {
			// -0.5..0.9 => 0..1
			s = x + 0.5;
			v = -y + 0.5;
			Palette.setVarOverlay(VarSelected[0],VarSelected[1],s,v);
			}
		else {
			// -0.5..0.4 => -1..0; 0.4..0.5 => 0..1
			s = x>0.4 ? (x-0.4)/0.1 : (x+0.5)/0.9-1;
			y = -y;
			v = y>0.4 ? (y-0.4)/0.1 : (y+0.5)/0.9-1;
			Palette.setSV(s,v);
			}
		updateSV();
		}
	else if (elm.id=='contrast') {
	// -0.5..0.5 => 0..1
		var cL = x + 0.5;
		var cS = 0.5 - y;
		Palette.setContrast(cS,cL);
		updateContrast();
		}
	if ($('#presets select').get(0).selectedIndex!=0) {
		$('#presets select').get(0).selectedIndex = 0;
		$('#presets select').trigger('change');
		}
	}



