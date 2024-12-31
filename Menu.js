function showRightMenu(menuID, width) {
    let menu = document.getElementById(menuID);
    menu.style.visibility = "visible";
    menu.style.width = '' + width + 'vw';
    document.getElementById('menuicons').style.display = "none";
}

function hideRightMenu(menuID) {
    let menu = document.getElementById(menuID);
    document.getElementById('menuicons').style.display = "inline";
    menu.style.width = "0%";
    setTimeout(function() {
        menu.style.visibility = "hidden";
    }, 100);
}
