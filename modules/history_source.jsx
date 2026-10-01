var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
/* No edited text snapshot. Read exact XML ZIP member, bound to the locked DOCX. */
SHAN.historySource = {
    lockedHash: "1beb214adf0372b61bb4ca312c20317f0c77b38812f1b17131e37e6bb5b9756f",
    at: function (collection, index) {
        if (!collection || collection.isValid === false || typeof collection.length !== "number" || collection.length < 1) { return null; }
        if (index < 0) { index += collection.length; }
        if (index < 0 || index >= collection.length || Math.floor(index) !== index) { return null; }
        var value = collection[index];
        if (value !== undefined && value !== null) { return value; }
        return typeof collection.item === "function" ? collection.item(index) : null;
    },
    require: function (condition, message) { if (!condition) { throw new Error("History: " + message); } },
    read: function (file, encoding) {
        this.require(file.exists, "Missing file: " + file.fsName);
        file.encoding = encoding || "UTF-8";
        this.require(file.open("r"), "Cannot read: " + file.fsName);
        try { return file.read(); } finally { file.close(); }
    },
    utf8: function (text) {
        var out = "", i, c, low;
        for (i = 0; i < text.length; i += 1) {
            c = text.charCodeAt(i);
            if (c >= 0xD800 && c <= 0xDBFF) {
                low = text.charCodeAt(i + 1);
                this.require(low >= 0xDC00 && low <= 0xDFFF, "Unpaired Unicode surrogate");
                c = 0x10000 + ((c - 0xD800) << 10) + low - 0xDC00; i += 1;
            }
            if (c < 128) { out += String.fromCharCode(c); }
            else if (c < 2048) { out += String.fromCharCode(192 | (c >> 6), 128 | (c & 63)); }
            else if (c < 65536) { out += String.fromCharCode(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
            else { out += String.fromCharCode(240 | (c >> 18), 128 | ((c >> 12) & 63), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
        }
        return out;
    },
    sha256: function (bytes) {
        var k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
            0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
            0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
            0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
            0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
            0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
            0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
            0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        var h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
        var length = bytes.length, blocks = Math.ceil((length + 9) / 64), w = [], i, j, n, x, y, a,b,c,d,e,f,g,v,t1,t2;
        function rr(value, shift) { return (value >>> shift) | (value << (32 - shift)); }
        function octet(pos) {
            if (pos < length) { return bytes.charCodeAt(pos) & 255; }
            if (pos === length) { return 128; }
            if (pos >= blocks * 64 - 4) { return ((length * 8) >>> ((blocks * 64 - 1 - pos) * 8)) & 255; }
            return 0;
        }
        this.require(length < 0x20000000, "SHA-256 input exceeds supported 512 MB limit");
        for (i = 0; i < blocks; i += 1) {
            for (j = 0; j < 16; j += 1) {
                n = i * 64 + j * 4; w[j] = (octet(n) << 24) | (octet(n + 1) << 16) | (octet(n + 2) << 8) | octet(n + 3);
            }
            for (j = 16; j < 64; j += 1) {
                x = w[j - 15]; y = w[j - 2];
                w[j] = ((rr(x,7) ^ rr(x,18) ^ (x >>> 3)) + w[j-16] + (rr(y,17) ^ rr(y,19) ^ (y >>> 10)) + w[j-7]) | 0;
            }
            a=h[0];b=h[1];c=h[2];d=h[3];e=h[4];f=h[5];g=h[6];v=h[7];
            for (j = 0; j < 64; j += 1) {
                t1 = (v + (rr(e,6)^rr(e,11)^rr(e,25)) + ((e&f)^((~e)&g)) + k[j] + w[j]) | 0;
                t2 = ((rr(a,2)^rr(a,13)^rr(a,22)) + ((a&b)^(a&c)^(b&c))) | 0;
                v=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
            }
            h[0]=(h[0]+a)|0;h[1]=(h[1]+b)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;
            h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+v)|0;
        }
        var result = "";
        for (i = 0; i < h.length; i += 1) { result += ("00000000" + (h[i] >>> 0).toString(16)).slice(-8); }
        return result;
    },
    fileHash: function (file) { return this.sha256(this.read(file, "BINARY")); },
    xmlText: function (value) {
        // Decode XML syntax ONCE; never trim or normalize the manuscript's Unicode.
        this.require(!/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/.test(value), "Unsupported XML entity");
        var self = this, named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
        return value.replace(/&([^;]+);/g, function (whole, name) {
            if (named.hasOwnProperty(name)) { return named[name]; }
            var code = name.charAt(1) === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
            self.require(code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 0xD7FF) ||
                (code >= 0xE000 && code <= 0xFFFD) || (code >= 0x10000 && code <= 0x10FFFF), "Invalid XML character reference: " + whole);
            if (code <= 0xFFFF) { return String.fromCharCode(code); }
            code -= 0x10000;
            return String.fromCharCode(0xD800 + (code >> 10), 0xDC00 + (code & 1023));
        });
    },
    xmlTree: function (text) {
        // ES3 strings/arrays only, as in the existing source-fixture readers.
        // This bounded reader accepts the locked Word XML; DTD/entities are not supported.
        // No E4X globals or host XML method/property lookups participate in source verification.
        var tokens = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/[A-Za-z_][A-Za-z0-9_.:-]*\s*>|<[A-Za-z_][A-Za-z0-9_.:-]*(?:\s+[A-Za-z_][A-Za-z0-9_.:-]*\s*=\s*(?:"[^"]*"|'[^']*'))*\s*\/?>|[^<]+/g;
        // Avoid slash delimiters in the tag-name regex (host Error 23 at the old literal).
        var openNamePattern = new RegExp("^<([A-Za-z_][A-Za-z0-9_.:-]*)");
        var closeNamePattern = new RegExp("^</([A-Za-z_][A-Za-z0-9_.:-]*)");
        var stack = [], root = null, cursor = 0, match, token, parent, node, name, nameMatch, prefix, colon, namespaces, copied, key, attr, attrs, attributes;
        while ((match = tokens.exec(text)) !== null) {
            this.require(match.index === cursor, "Unsupported/malformed XML at character " + cursor);
            token = match[0]; cursor = tokens.lastIndex;
            if (token.slice(0, 4) === "<!--" || token.slice(0, 2) === "<?") { continue; }
            parent = stack.length ? stack[stack.length - 1] : null;
            if (token.charAt(0) !== "<" || token.slice(0, 9) === "<![CDATA[") {
                var data = token.slice(0, 9) === "<![CDATA[" ? token.slice(9, -3) : this.xmlText(token);
                if (parent) { parent.children.push({ kind: "text", text: data }); }
                else { this.require(/^[\s\uFEFF]*$/.test(data), "Text outside Word XML document"); }
                continue;
            }
            if (token.slice(0, 2) === "</") {
                nameMatch = closeNamePattern.exec(token);
                this.require(nameMatch && nameMatch.length > 1 && typeof nameMatch[1] === "string", "Missing XML closing tag name at character " + match.index);
                name = nameMatch[1];
                this.require(parent && parent.qname === name, "Mismatched XML closing tag " + name + " at character " + match.index);
                stack.pop(); continue;
            }
            nameMatch = openNamePattern.exec(token);
            this.require(nameMatch && nameMatch.length > 1 && typeof nameMatch[1] === "string", "Missing XML opening tag name at character " + match.index);
            name = nameMatch[1];
            namespaces = parent ? parent.namespaces : { xml: "http://www.w3.org/XML/1998/namespace" }; copied = false;
            attrs = /\s+([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*("[^"]*"|'[^']*')/g; attributes = {};
            while ((attr = attrs.exec(token)) !== null) {
                this.require(!attributes.hasOwnProperty(attr[1]), "Duplicate XML attribute " + attr[1]);
                attributes[attr[1]] = this.xmlText(attr[2].slice(1, -1));
                if (attr[1] === "xmlns" || attr[1].slice(0, 6) === "xmlns:") {
                    if (!copied) {
                        var inherited = namespaces; namespaces = {};
                        for (key in inherited) { if (inherited.hasOwnProperty(key)) { namespaces[key] = inherited[key]; } }
                        copied = true;
                    }
                    namespaces[attr[1] === "xmlns" ? "" : attr[1].slice(6)] = attributes[attr[1]];
                }
            }
            colon = name.indexOf(":"); prefix = colon < 0 ? "" : name.slice(0, colon);
            this.require(colon < 0 || namespaces.hasOwnProperty(prefix), "Unbound XML namespace prefix " + prefix);
            node = { kind: "element", qname: name, name: colon < 0 ? name : name.slice(colon + 1),
                uri: namespaces.hasOwnProperty(prefix) ? namespaces[prefix] : "", namespaces: namespaces, children: [] };
            if (parent) { parent.children.push(node); }
            else { this.require(root === null, "Multiple XML document roots"); root = node; }
            if (!/\/\s*>$/.test(token)) { stack.push(node); }
        }
        this.require(cursor === text.length && stack.length === 0 && root !== null, "Incomplete/malformed Word XML at character " + cursor);
        return root;
    },
    nodeName: function (node) {
        this.require(node && node.kind === "element" && typeof node.name === "string", "Missing parsed XML element name");
        return node.name;
    },
    wordChildren: function (node, wanted) {
        this.require(node && node.children && typeof node.children.length === "number", "Missing parsed XML children for Word " + wanted);
        var children = node.children, i, child, out = [], seen = [];
        for (i = 0; i < children.length; i += 1) {
            child = children[i];
            this.require(child && typeof child.kind === "string", "Missing parsed XML child " + i + " for Word " + wanted);
            if (child.kind !== "element") { continue; }
            seen.push(child.name + "{" + child.uri + "}");
            if (child.name === wanted && child.uri === "http://schemas.openxmlformats.org/wordprocessingml/2006/main") { out.push(child); }
        }
        return { matches: out, seen: seen.join(", ") };
    },
    walkText: function (node) {
        var name = this.nodeName(node), children, i, out = "";
        if (name === "Fallback" || name === "drawing" || name === "pict" || name === "pPr" || name === "rPr") { return ""; }
        if (name === "t") {
            children = node.children;
            for (i = 0; i < children.length; i += 1) {
                this.require(children[i].kind === "text", "Unexpected element inside Word text"); out += children[i].text;
            }
            return out;
        }
        if (name === "tab") { return "\t"; }
        if (name === "br") { return "\n"; }
        children = node.children;
        for (i = 0; i < children.length; i += 1) {
            if (children[i].kind === "element") { out += this.walkText(children[i]); }
        }
        return out;
    },
    collect: function (node, wanted, out) {
        if (this.nodeName(node) === "Fallback") { return; }
        if (this.nodeName(node) === wanted) { out.push(node); return; }
        var children = node.children, i;
        for (i = 0; i < children.length; i += 1) {
            if (children[i].kind === "element") { this.collect(children[i], wanted, out); }
        }
    },
    parse: function (xmlText) {
        var root = this.xmlTree(xmlText);
        this.require(this.nodeName(root) === "document", "Expected Word document XML root; found " + this.nodeName(root));
        this.require(root.uri === "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "Unexpected Word XML root namespace " + root.uri);
        var bodies = this.wordChildren(root, "body");
        this.require(bodies.matches.length === 1, "Expected one Word XML body; found " + bodies.matches.length + "; direct children=" + bodies.seen);
        var body = bodies.matches[0];
        var ps = this.wordChildren(body, "p").matches, out = [], boxes = [], i, local;
        this.require(ps.length > 0, "No direct Word paragraphs in XML body");
        for (i = 0; i < ps.length; i += 1) {
            out.push(this.walkText(ps[i])); local = []; this.collect(ps[i], "txbxContent", local);
            if (local.length) { boxes.push({ source_paragraph: i + 1, text: this.walkText(local[0]) }); }
        }
        return { paragraphs: out, textboxes: boxes };
    },
    verifySource: function (root, audit) {
        this.require(audit.source_sha256 === this.lockedHash, "Unexpected source identity");
        this.require(this.fileHash(File(root + "/" + audit.source_file)) === audit.source_sha256, "DOCX hash mismatch");
        this.require(this.fileHash(File(root + "/" + audit.xml_file)) === audit.xml_sha256, "Original XML hash mismatch");
        var i;
        for (i = 0; i < audit.assets.length; i += 1) {
            this.require(this.fileHash(File(root + "/" + audit.assets[i].file)) === audit.assets[i].sha256, "Image hash mismatch: " + (i + 1));
        }
        var source = this.parse(this.read(File(root + "/" + audit.xml_file)));
        this.require(source.paragraphs.length === audit.source_paragraph_count, "Source paragraph count mismatch");
        for (i = 0; i < source.paragraphs.length; i += 1) {
            this.require(this.sha256(this.utf8(source.paragraphs[i])) === audit.source_paragraph_sha256[i], "Source paragraph mismatch: " + (i + 1));
        }
        this.require(source.textboxes.length === 1 && source.textboxes[0].source_paragraph === 6, "Floating caption mismatch");
        return source;
    },
    validateMap: function (map, source) {
        var expected = [], i, position, years = [5,7,17,40,51,54,57,63,71,77,96,107,117,123,131,139,155,172,174,179,194];
        for (i = 1; i <= 216; i += 1) { if (i !== 148) { expected.push(i); } }
        for (i = 0; i < expected.length; i += 1) { if (expected[i] === 150) { position = i + 1; } }
        expected.splice(position, 0, 148);
        this.require(map.paragraph_order.join(",") === expected.join(","), "Unauthorized paragraph omission/reorder");
        this.require(map.years.join(",") === years.join(","), "Year mapping mismatch");
        this.require(map.paragraphs.length === 216 && map.images.length === 24 && map.captions.length === 5, "Incomplete mapping");
        this.require(source.paragraphs.length === 216, "Wrong source paragraph count");
        var anchors = [6,28,38,61,87,90,90,94,105,115,115,122,138,150,153,187,189,189,192,207,210,210,213,216];
        for (i = 0; i < map.images.length; i += 1) {
            this.require(map.images[i].image_index === i + 1 && map.images[i].source_paragraph === anchors[i] &&
                map.images[i].relationship_id === "rId" + (i + 4), "Image mapping mismatch: " + (i + 1));
        }
        var captionPs = [6,29,39,190,193], captionImages = ["1","2","3","17,18","19"];
        for (i = 0; i < map.captions.length; i += 1) {
            this.require(map.captions[i].source_paragraph === captionPs[i] && map.captions[i].image_indices.join(",") === captionImages[i], "Caption relationship mismatch");
        }
    },
    /* Only generated anchor markers and ONE terminal paragraph delimiter.
       No trim, dash conversion, whitespace collapse, NFC, or control cleanup. */
    paragraphText: function (contents, expectedAnchors) {
        var value = String(contents), count = (value.match(/\uFFFC/g) || []).length;
        this.require(count === expectedAnchors, "Unexpected inline object marker count");
        value = value.replace(/\uFFFC/g, "");
        if (value.charAt(value.length - 1) === "\r") { value = value.slice(0, -1); }
        return value;
    },
    assertParagraphs: function (story, source, map, runtime) {
        this.require(story && story.isValid !== false, "Missing/invalid History story for paragraph comparison");
        var paragraphs = story.paragraphs;
        this.require(paragraphs && typeof paragraphs.length === "number", "Missing History paragraph collection");
        this.require(paragraphs.length === map.paragraph_order.length, "Output paragraph count mismatch: " + paragraphs.length);
        var i, j, p, anchorCount;
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            p = map.paragraph_order[i]; anchorCount = 0;
            if (runtime) { runtime.source_paragraph = p; runtime.operation = "compare paragraph contents"; }
            for (j = 0; j < map.images.length; j += 1) { if (map.images[j].source_paragraph === p) { anchorCount += 1; } }
            var paragraph = this.at(paragraphs, i);
            this.require(paragraph && paragraph.isValid !== false && paragraph.contents !== undefined,
                "Missing/invalid paragraph for source paragraph " + p);
            this.require(this.paragraphText(paragraph.contents, anchorCount) === source.paragraphs[p - 1], "Text/order changed at source paragraph " + p);
        }
    }
};
